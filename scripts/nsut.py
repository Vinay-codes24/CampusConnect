import json
import os
import sys
import time
from pathlib import Path
from datetime import datetime

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import WebDriverException


IMS_URL = "https://imsnsit.org/imsnsit/"
OUTPUT_FILE = Path(__file__).resolve().parent.parent / "attendance_export.json"
CREDENTIALS_FILE = Path(__file__).resolve().parent.parent / ".nsut_creds.json"

ACADEMIC_YEAR = "2026-27"
SEMESTER = "3"

# Auto mode: launched by CampusConnect server. Non-interactive, JSON to stdout.
AUTO_MODE = "--auto" in sys.argv

# Pre-authenticated IMS session handed over by the CampusConnect native login
# panel (e.g. "PHPSESSID=abc123"). When present, the manual login + CAPTCHA
# step is skipped by injecting this cookie into the browser session. The value
# is NEVER logged and only lives in this process's environment.
IMS_SESSION = os.getenv("NSUT_IMS_SESSION", "").strip()

# Optional headless Chrome. Enable via --headless or NSUT_HEADLESS=1.
HEADLESS_MODE = (
    "--headless" in sys.argv
    or os.getenv("NSUT_HEADLESS", "").strip().lower() in {"1", "true", "yes"}
)

# Automated CAPTCHA solving support (ddddocr)
try:
    import ddddocr
    _ocr_instance = None

    def get_ocr():
        global _ocr_instance
        if _ocr_instance is None:
            _ocr_instance = ddddocr.DdddOcr(show_ad=False)
        return _ocr_instance

    HAS_DDDDOCR = True
except ImportError:
    HAS_DDDDOCR = False
    get_ocr = None


def clean(text):
    return " ".join(text.replace("\xa0", " ").split()).strip()


def log(message):
    """Print progress to stderr (captured by the server, not mixed with JSON output)."""
    print(message, file=sys.stderr, flush=True)


def auto_input(prompt):
    """In auto mode, log and continue. In manual mode, call input()."""
    if AUTO_MODE:
        log(f"[auto] {prompt}")
        return ""
    return input(prompt)


def get_credentials():
    """Retrieve Roll No and password from env, CLI args, saved file, or interactive prompt."""
    uid = os.getenv("NSUT_UID") or os.getenv("NSUT_ROLL_NO") or ""
    pwd = os.getenv("NSUT_PASSWORD") or os.getenv("NSUT_PWD") or ""

    for i, arg in enumerate(sys.argv):
        if arg in ("--uid", "--roll") and i + 1 < len(sys.argv):
            uid = sys.argv[i + 1]
        elif arg in ("--pwd", "--password") and i + 1 < len(sys.argv):
            pwd = sys.argv[i + 1]

    if not (uid and pwd) and CREDENTIALS_FILE.exists():
        try:
            with CREDENTIALS_FILE.open("r", encoding="utf-8") as f:
                saved = json.load(f)
                uid = uid or saved.get("uid", "")
                pwd = pwd or saved.get("pwd", "")
        except Exception:
            pass

    if not (uid and pwd) and not AUTO_MODE:
        print("\n--- NSUT Automated Login Setup ---")
        if not uid:
            uid = input("Enter your IMS Roll Number / UID: ").strip()
        if not pwd:
            import getpass
            pwd = getpass.getpass("Enter your IMS Password: ").strip()

        if uid and pwd and not CREDENTIALS_FILE.exists():
            save = input("Save credentials locally (.nsut_creds.json) for 1-click auto-login next time? (y/n): ").strip().lower()
            if save in ("y", "yes"):
                try:
                    with CREDENTIALS_FILE.open("w", encoding="utf-8") as f:
                        json.dump({"uid": uid, "pwd": pwd}, f, indent=2)
                    CREDENTIALS_FILE.chmod(0o600)
                    print("Credentials saved securely to .nsut_creds.json (git-ignored).\n")
                except Exception as e:
                    print(f"Could not save credentials: {e}\n")

    return uid, pwd


def is_logged_in(driver):
    """Check if the student portal home / 'My Activities' is accessible."""
    driver.switch_to.default_content()
    for context in [""] + frame_names(driver):
        try:
            switch_to_context(driver, context)
            links = driver.find_elements(By.TAG_NAME, "a")
            for link in links:
                if link.is_displayed() and clean(link.text).casefold() == "my activities":
                    driver.switch_to.default_content()
                    return True
        except WebDriverException:
            continue
    driver.switch_to.default_content()
    return False


def wait_for_login(driver, timeout=120):
    """Poll the page to detect when the student has completed IMS login."""
    log("Waiting for IMS login to complete...")
    deadline = time.time() + timeout
    while time.time() < deadline:
        if is_logged_in(driver):
            log("IMS login detected!")
            return True
        time.sleep(2)
    log("IMS login wait timed out.")
    return False


def find_login_form(driver):
    """Scan all frames for the IMS login form (uid, pwd, cap, captchaimg)."""
    driver.switch_to.default_content()
    contexts = ["", "banner"] + [f for f in frame_names(driver) if f != "banner"]
    for context in contexts:
        try:
            switch_to_context(driver, context)
            uids = driver.find_elements(By.CSS_SELECTOR, "input[name='uid'], input#uid")
            pwds = driver.find_elements(By.CSS_SELECTOR, "input[name='pwd'], input#pwd")
            caps = driver.find_elements(By.CSS_SELECTOR, "input[name='cap'], input#cap")
            imgs = driver.find_elements(By.CSS_SELECTOR, "img#captchaimg, img[src*='captcha']")
            btns = driver.find_elements(By.CSS_SELECTOR, "input[type='submit'][name='login'], input[type='submit'][value*='Login'], input[type='submit']")

            if uids and pwds and caps and imgs and btns:
                return context, uids[0], pwds[0], caps[0], imgs[0], btns[0]
        except WebDriverException:
            continue
    driver.switch_to.default_content()
    return None


def check_access_denied(driver):
    """Detect if IMS rendered an 'Access Denied' screen."""
    try:
        driver.switch_to.default_content()
        for context in ["", "banner"] + frame_names(driver):
            try:
                switch_to_context(driver, context)
                body = driver.find_elements(By.TAG_NAME, "body")
                if body and "access denied" in body[0].text.lower():
                    return True
            except WebDriverException:
                pass
    except Exception:
        pass
    driver.switch_to.default_content()
    return False


def get_login_error_message(driver):
    """Extract portal error message (e.g. invalid password vs wrong captcha)."""
    driver.switch_to.default_content()
    for context in ["", "banner"] + frame_names(driver):
        try:
            switch_to_context(driver, context)
            fonts = driver.find_elements(By.CSS_SELECTOR, "font[color*='red'], font[color='RED']")
            for f in fonts:
                text = clean(f.text)
                if text and not any(skip in text.lower() for skip in ["do not share", "responsible for", "activate"]):
                    return text
        except WebDriverException:
            pass
    driver.switch_to.default_content()
    return ""


def reset_to_student_login(driver):
    """Safely return to student login via homepage link to guarantee valid session/referrer."""
    driver.switch_to.default_content()
    try:
        click_student_login(driver)
        time.sleep(2)
    except Exception as e:
        log(f"Reset via homepage warning: {e}")


def refresh_captcha_in_place(driver, img_el):
    """Refresh CAPTCHA without full page reload to prevent session loss or Access Denied."""
    try:
        driver.execute_script(
            "arguments[0].src = 'plum5_fw_utils.php?rty=captcha&typ=login&_ts=' + new Date().getTime();",
            img_el,
        )
        time.sleep(1)
        return True
    except WebDriverException:
        return False


def try_auto_login(driver, uid, pwd, max_retries=3):
    """Automatically solve the visual CAPTCHA with OCR and log in to NSUT IMS."""
    if not (uid and pwd):
        log("No Roll Number or Password available for auto-login.")
        return False

    if not HAS_DDDDOCR or get_ocr is None:
        log("ddddocr is not installed. Install with 'pip install ddddocr' for auto-CAPTCHA.")
        return False

    ocr = get_ocr()

    for attempt in range(1, max_retries + 1):
        log(f"Auto-login attempt {attempt}/{max_retries}: solving visual CAPTCHA...")
        time.sleep(1.5)

        # Check for Access Denied screen first
        if check_access_denied(driver):
            log("IMS showed 'Access Denied'. Re-navigating via verified homepage link...")
            reset_to_student_login(driver)

        form = find_login_form(driver)
        if not form:
            time.sleep(2)
            form = find_login_form(driver)

        if not form:
            if is_logged_in(driver):
                log("Already logged in!")
                return True
            log("Login form not found. Resetting to Student Login via homepage...")
            reset_to_student_login(driver)
            form = find_login_form(driver)

        if not form:
            log("Could not find login form after reset.")
            return False

        context, uid_el, pwd_el, cap_el, img_el, btn_el = form

        try:
            # Capture the exact rendered CAPTCHA image element
            img_bytes = img_el.screenshot_as_png
            solved_cap = ocr.classification(img_bytes).strip()
            log(f"Solved CAPTCHA: '{solved_cap}'")

            # Fill in credentials and solved CAPTCHA
            uid_el.clear()
            uid_el.send_keys(uid)
            pwd_el.clear()
            pwd_el.send_keys(pwd)
            cap_el.clear()
            cap_el.send_keys(solved_cap)

            time.sleep(0.5)
            btn_el.click()

            # Poll for successful login
            deadline = time.time() + 8
            succeeded = False
            while time.time() < deadline:
                if is_logged_in(driver):
                    log("Automated login succeeded!")
                    return True
                if check_access_denied(driver):
                    log("IMS showed 'Access Denied'. Resetting via portal homepage...")
                    reset_to_student_login(driver)
                    break
                time.sleep(1)

            # Check for specific portal error text
            portal_err = get_login_error_message(driver)
            if portal_err:
                log(f"IMS message: {portal_err}")
                if any(bad in portal_err.lower() for bad in ["invalid user", "invalid password", "wrong password"]):
                    log("ERROR: Your Roll Number or Password appears incorrect.")
                    if CREDENTIALS_FILE.exists():
                        log(f"Tip: Update or delete {CREDENTIALS_FILE.name} if you changed your IMS password.")
                    return False

            log(f"Attempt {attempt} did not succeed (retrying with fresh CAPTCHA)...")
            # Refresh CAPTCHA safely in place or via verified homepage
            refreshed = False
            form = find_login_form(driver)
            if form:
                refreshed = refresh_captcha_in_place(driver, form[4])
            if not refreshed:
                reset_to_student_login(driver)

        except WebDriverException as e:
            log(f"Notice during attempt {attempt}: {e}")
            reset_to_student_login(driver)

    return is_logged_in(driver)


def click_student_login(driver):
    """Open the homepage and click the verified Student Login link."""
    print("Opening NSUT IMS...")

    driver.get(IMS_URL)
    wait = WebDriverWait(driver, 20)

    link = wait.until(
        EC.element_to_be_clickable(
            (By.CSS_SELECTOR, 'a[href="student.htm"]')
        )
    )

    link.click()
    print("Student Login clicked!")

    wait.until(
        lambda d: "student.htm" in d.current_url.lower()
    )


def frame_names(driver):
    driver.switch_to.default_content()

    names = []

    for frame in driver.find_elements(By.CSS_SELECTOR, "frame, iframe"):
        name = frame.get_attribute("name")

        if name:
            names.append(name)

    return names


def switch_to_context(driver, context):
    driver.switch_to.default_content()

    if context:
        driver.switch_to.frame(context)


def click_my_activities(driver):
    """Click My Activities in the top navigation."""
    print("Looking for My Activities...")

    for context in [""] + frame_names(driver):
        try:
            switch_to_context(driver, context)

            links = driver.find_elements(By.TAG_NAME, "a")

            for link in links:
                if not link.is_displayed():
                    continue

                if clean(link.text).casefold() == "my activities":
                    link.click()
                    print("My Activities clicked!")
                    time.sleep(2)
                    driver.switch_to.default_content()
                    return True

        except WebDriverException:
            continue

    driver.switch_to.default_content()
    return False


def expand_attendance(driver):
    """
    Use the exact expandable-menu structure found in your screenshot.
    """
    print("Expanding ATTENDANCE menu...")

    for context in [""] + frame_names(driver):
        try:
            switch_to_context(driver, context)

            menu_items = driver.find_elements(
                By.CSS_SELECTOR, "li.expandable"
            )

            for item in menu_items:
                try:
                    heading = item.find_element(By.TAG_NAME, "b")

                    if clean(heading.text).casefold() != "attendance":
                        continue

                    submenu = item.find_element(By.XPATH, "./ul")

                    if submenu.is_displayed():
                        print("ATTENDANCE menu is already expanded.")
                        driver.switch_to.default_content()
                        return True

                    # The screenshot shows this expandable control.
                    hitarea = item.find_element(
                        By.CSS_SELECTOR,
                        ".hitarea.expandable-hitarea"
                    )

                    hitarea.click()
                    time.sleep(1)

                    if submenu.is_displayed():
                        print("ATTENDANCE expanded successfully!")
                        driver.switch_to.default_content()
                        return True

                    # Fallback: click the heading itself.
                    heading.click()
                    time.sleep(1)

                    if submenu.is_displayed():
                        print("ATTENDANCE expanded successfully!")
                        driver.switch_to.default_content()
                        return True

                except WebDriverException:
                    continue

        except WebDriverException:
            continue

    driver.switch_to.default_content()
    return False


def click_my_attendance(driver):
    """Click the My Attendance link targeting the data frame."""
    print("Looking for My Attendance...")

    for context in [""] + frame_names(driver):
        try:
            switch_to_context(driver, context)

            links = driver.find_elements(
                By.CSS_SELECTOR, 'a[target="data"]'
            )

            for link in links:
                if clean(link.text).casefold() == "my attendance":
                    link.click()
                    print("My Attendance clicked!")
                    time.sleep(2)
                    driver.switch_to.default_content()
                    return True

        except WebDriverException:
            continue

    driver.switch_to.default_content()
    return False


def select_year_and_semester(driver):
    """Select 2026-27 and semester 3, then submit the report."""
    print("Selecting academic year and semester...")

    driver.switch_to.default_content()

    names = frame_names(driver)

    if "data" in names:
        driver.switch_to.frame("data")

    selects = driver.find_elements(By.TAG_NAME, "select")

    if len(selects) < 2:
        print("Couldn't find both report dropdowns.")
        driver.switch_to.default_content()
        return False

    year_select = Select(selects[0])
    semester_select = Select(selects[1])

    # Match the exact visible year option.
    year_option = next(
        (
            option.text.strip()
            for option in year_select.options
            if option.text.strip() == ACADEMIC_YEAR
        ),
        None,
    )

    if year_option is None:
        print(f"Year {ACADEMIC_YEAR} isn't available in the dropdown.")
        print("Available years:")

        for option in year_select.options:
            print(" -", clean(option.text))

        driver.switch_to.default_content()
        return False

    year_select.select_by_visible_text(year_option)
    print(f"Selected academic year: {ACADEMIC_YEAR}")

    # Match semester 3 by its visible text.
    semester_option = next(
        (
            option.text.strip()
            for option in semester_select.options
            if option.text.strip() == SEMESTER
        ),
        None,
    )

    if semester_option is None:
        print(f"Semester {SEMESTER} isn't available in the dropdown.")
        print("Available semesters:")

        for option in semester_select.options:
            print(" -", clean(option.text))

        driver.switch_to.default_content()
        return False

    semester_select.select_by_visible_text(semester_option)
    print(f"Selected semester: {SEMESTER}")

    # Click Submit.
    buttons = driver.find_elements(
        By.CSS_SELECTOR,
        "input[type='submit'], input[type='button'], button"
    )

    for button in buttons:
        try:
            label = clean(
                button.text or button.get_attribute("value") or ""
            ).casefold()

            if label == "submit" and button.is_displayed():
                button.click()
                print("Submitted attendance report!")
                time.sleep(2)
                driver.switch_to.default_content()
                return True

        except WebDriverException:
            continue

    driver.switch_to.default_content()
    print("Couldn't find the report Submit button.")
    return False


def read_tables(driver):
    tables = []

    for index, table in enumerate(
        driver.find_elements(By.TAG_NAME, "table")
    ):
        rows = []

        for tr in table.find_elements(By.TAG_NAME, "tr"):
            cells = tr.find_elements(By.XPATH, "./th | ./td")
            row = [clean(cell.text) for cell in cells]

            if any(row):
                rows.append(row)

        if rows:
            tables.append({"index": index, "rows": rows})

    return tables


def find_header(rows):
    for index, row in enumerate(rows):
        if any(
            cell.strip().lower() in ("days", "day", "date")
            for cell in row
        ):
            return index

    return None


def find_subjects(tables):
    subjects = {}

    for table in tables:
        for row in table["rows"]:
            for cell in row:
                if "-" not in cell:
                    continue

                code, name = cell.split("-", 1)
                code = code.strip()
                name = name.strip()

                if (
                    code and name and len(code) <= 20
                    and any(char.isdigit() for char in code)
                ):
                    subjects[code] = name

    return subjects


def parse_month(table, subjects):
    rows = table["rows"]
    header_index = find_header(rows)

    if header_index is None:
        return None

    header = rows[header_index]

    day_column = next(
        (
            i for i, cell in enumerate(header)
            if cell.strip().lower() in ("days", "day", "date")
        ),
        None,
    )

    if day_column is None:
        return None

    columns = []

    for index, heading in enumerate(header):
        code = heading.strip()

        if index == day_column or not code:
            continue

        if code in subjects or any(char.isdigit() for char in code):
            columns.append({
                "index": index,
                "code": code,
                "name": subjects.get(code, code),
            })

    if not columns:
        return None

    records = []
    summary = {}

    for row in rows[header_index + 1:]:
        label = row[0].strip().lower() if row else ""

        if "total classes" in label:
            summary_type = "conducted"
        elif "total absent" in label:
            summary_type = "absent"
        elif "total present" in label:
            summary_type = "attended"
        else:
            summary_type = None

        if summary_type:
            for column in columns:
                index = column["index"]

                if index >= len(row):
                    continue

                try:
                    number = int(row[index])
                except ValueError:
                    continue

                summary.setdefault(column["code"], {})
                summary[column["code"]][summary_type] = number

            continue

        if day_column >= len(row):
            continue

        day = row[day_column].strip()

        if not day or not any(char.isdigit() for char in day):
            continue

        for column in columns:
            index = column["index"]

            if index >= len(row):
                continue

            value = row[index].strip()

            if not value:
                continue

            if value == "1":
                status = "PRESENT"
            elif value == "0":
                status = "ABSENT"
            elif value in ("-", "--"):
                status = "NO_ENTRY"
            else:
                status = "OTHER"

            records.append({
                "day": day,
                "subjectCode": column["code"],
                "subject": column["name"],
                "rawValue": value,
                "status": status,
            })

    return {
        "tableIndex": table["index"],
        "dailyRecords": records,
        "summary": summary,
    }


def extract_attendance(driver):
    driver.switch_to.default_content()

    if "data" in frame_names(driver):
        driver.switch_to.frame("data")

    tables = read_tables(driver)
    print(f"Found {len(tables)} tables.")

    if not tables:
        driver.switch_to.default_content()
        return None

    subjects = find_subjects(tables)
    months = []

    for table in tables:
        parsed = parse_month(table, subjects)

        if parsed:
            months.append(parsed)

    driver.switch_to.default_content()

    if not months:
        print("No monthly attendance tables detected.")
        return None

    daily_records = []

    for month in months:
        daily_records.extend(month["dailyRecords"])

    # Keep the latest summary instead of adding potentially cumulative totals.
    summaries = {}

    for month in months:
        for code, values in month["summary"].items():
            summaries.setdefault(code, {})
            summaries[code].update(values)

    subject_results = []

    for code in sorted(set(subjects) | set(summaries)):
        stats = summaries.get(code, {})
        conducted = stats.get("conducted")
        attended = stats.get("attended")
        absent = stats.get("absent")

        percentage = None

        if conducted is not None and attended is not None and conducted > 0:
            percentage = round(attended / conducted * 100, 2)

        subject_results.append({
            "code": code,
            "subject": subjects.get(code, code),
            "conducted": conducted,
            "attended": attended,
            "absent": absent,
            "percentage": percentage,
        })

    return {
        "source": "NSUT IMS",
        "academicYear": ACADEMIC_YEAR,
        "semester": SEMESTER,
        "exportedAt": datetime.now().astimezone().isoformat(),
        "subjects": subject_results,
        "months": [
            {
                "tableIndex": month["tableIndex"],
                "dailyRecordCount": len(month["dailyRecords"]),
            }
            for month in months
        ],
        "dailyRecords": daily_records,
    }


def apply_ims_session(driver):
    """Inject a pre-authenticated IMS session (from the native login panel).

    The cookie value is read from the environment and never logged. Returns
    True when IMS recognizes the session (login already complete), otherwise
    False so the caller falls back to the normal manual login flow.
    """
    log("Trying the authenticated IMS session from CampusConnect...")

    try:
        driver.get(IMS_URL)

        for part in IMS_SESSION.split(";"):
            name, _, value = part.strip().partition("=")
            if name and value:
                driver.add_cookie({
                    "name": name,
                    "value": value,
                    "domain": ".imsnsit.org",
                    "path": "/",
                })

        # Load the student frameset: with an authenticated session its banner
        # frame renders the portal menu ("My Activities") that wait_for_login
        # looks for.
        driver.get(IMS_URL + "student.htm")
        time.sleep(2)

        if wait_for_login(driver, timeout=20):
            log("IMS session accepted; manual login not required.")
            return True

        log("Injected session not recognized; falling back to manual login.")
        return False

    except WebDriverException as error:
        log(f"Could not apply IMS session ({type(error).__name__}); falling back to manual login.")
        return False


def main():
    chrome_options = webdriver.ChromeOptions()
    chrome_options.add_argument("--window-size=1360,860")
    chrome_options.add_argument("--disable-notifications")

    if HEADLESS_MODE:
        chrome_options.add_argument("--headless=new")
        chrome_options.add_argument("--disable-gpu")

    driver = None
    try:
        driver = webdriver.Chrome(options=chrome_options)
    except WebDriverException as error:
        # Startup failure (Chrome/ChromeDriver missing or incompatible).
        # Never print the full traceback: it can contain local paths only.
        log(f"ERROR: Could not start Chrome ({type(error).__name__}).")
        log("Ensure Google Chrome is installed and up to date, then try again.")
        sys.exit(1)

    if not HEADLESS_MODE:
        try:
            driver.maximize_window()
        except WebDriverException:
            pass
    try:
        # Step 1: Authenticate. Prefer the pre-authenticated session from the
        # CampusConnect native login panel (no manual login needed); otherwise
        # open IMS and click Student Login for the manual CAPTCHA flow.
        session_logged_in = False
        if IMS_SESSION and AUTO_MODE:
            session_logged_in = apply_ims_session(driver)

        if not session_logged_in:
            log("Opening IMS and clicking Student Login...")
            click_student_login(driver)

            # Step 2: Attempt automatic login using ddddocr CAPTCHA solver
            uid, pwd = get_credentials()
            if uid and pwd and HAS_DDDDOCR and get_ocr is not None:
                log(f"Attempting automated login for Roll No: {uid}")
                if try_auto_login(driver, uid, pwd):
                    session_logged_in = True
                else:
                    log("Automated login could not complete. Falling back to manual login...")

            if not session_logged_in:
                # Fallback: Wait for student to log in manually if credentials aren't saved
                if AUTO_MODE:
                    if not wait_for_login(driver):
                        log("ERROR: Login was not completed within the time limit.")
                        sys.exit(1)
                else:
                    input(
                        "\nEnter your password and solve the CAPTCHA. "
                        "When the student homepage appears, press ENTER here..."
                    )

        time.sleep(2)

        # Keep the manual CAPTCHA/login step visible. Hide the browser only for
        # the subsequent automated IMS navigation, which happens after login.
        if AUTO_MODE and not HEADLESS_MODE:
            try:
                driver.minimize_window()
                log("NSUT login complete; browser minimized for automated attendance navigation.")
            except WebDriverException:
                pass

        # Step 3: Open My Activities.
        log("Looking for My Activities...")
        if not click_my_activities(driver):
            log("Couldn't automatically click My Activities, retrying...")
            time.sleep(3)
            if not click_my_activities(driver):
                auto_input("Click My Activities manually, then press ENTER...")

        # Step 4: Expand Attendance.
        log("Expanding ATTENDANCE menu...")
        if not expand_attendance(driver):
            log("Couldn't automatically expand ATTENDANCE, retrying...")
            time.sleep(3)
            if not expand_attendance(driver):
                auto_input("Expand ATTENDANCE manually, then press ENTER...")

        # Step 5: Open My Attendance.
        log("Looking for My Attendance...")
        if not click_my_attendance(driver):
            log("Couldn't automatically click My Attendance, retrying...")
            time.sleep(3)
            if not click_my_attendance(driver):
                auto_input("Click My Attendance manually, then press ENTER...")

        time.sleep(2)

        # Step 6: Choose academic year and semester, then submit.
        log("Selecting academic year and semester...")
        if not select_year_and_semester(driver):
            log("Couldn't automatically select year/semester, retrying...")
            time.sleep(3)
            if not select_year_and_semester(driver):
                auto_input(
                    "\nSelect year and semester manually, "
                    "then click Submit. Press ENTER when the report appears..."
                )

        # Step 7: Extract the attendance report.
        log("Extracting attendance report...")
        time.sleep(2)

        data = extract_attendance(driver)

        if data is None:
            log("ERROR: No attendance report was found on the IMS page.")
            log("Check the Chrome window for a login or navigation problem, then try again.")
            sys.exit(1)

        log("Extraction complete.")
        log("Subjects found: " + str(len(data["subjects"])))
        log("Daily records: " + str(len(data["dailyRecords"])))

        if AUTO_MODE:
            # Output JSON to stdout for the server to capture.
            print("===ATTENDANCE_JSON_START===")
            print(json.dumps(data, indent=2, ensure_ascii=False))
            print("===ATTENDANCE_JSON_END===")
        else:
            # Manual mode: save to file with confirmation.
            print("\n========== ATTENDANCE PREVIEW ==========")
            print("Academic year:", data["academicYear"])
            print("Semester:", data["semester"])
            print("Monthly tables:", len(data["months"]))
            print("Daily records:", len(data["dailyRecords"]))

            for subject in data["subjects"]:
                print(
                    f"{subject['code']} - {subject['subject']}: "
                    f"{subject['attended']} present / "
                    f"{subject['conducted']} conducted "
                    f"({subject['percentage']}%)"
                )

            answer = input(
                f"\nType YES to save {OUTPUT_FILE.name}: "
            ).strip()

            if answer == "YES":
                with OUTPUT_FILE.open("w", encoding="utf-8") as file:
                    json.dump(data, file, indent=2, ensure_ascii=False)

                print("\nSaved successfully:", OUTPUT_FILE)
                print("Keep this file private.")
            else:
                print("Cancelled. Existing JSON was not overwritten.")

            input("\nPress ENTER to close Chrome...")

    except Exception as error:
        # Message only — never the full traceback, which can include local paths.
        log(f"ERROR: Something went wrong ({type(error).__name__}): {error}")
        if AUTO_MODE:
            sys.exit(1)
        input("Press ENTER to close Chrome...")

    finally:
        if driver is not None:
            driver.quit()


if __name__ == "__main__":
    main()