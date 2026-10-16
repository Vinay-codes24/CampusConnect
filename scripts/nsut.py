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

ACADEMIC_YEAR = "2026-27"
SEMESTER = "3"

# Auto mode: launched by CampusConnect server. Non-interactive, JSON to stdout.
AUTO_MODE = "--auto" in sys.argv

# Optional headless Chrome. This is OFF for the automatic NSUT CAPTCHA flow:
# the student must solve the login CAPTCHA in a visible browser. Enable it only
# for genuinely headless IMS sessions, via --headless or NSUT_HEADLESS=1.
HEADLESS_MODE = (
    "--headless" in sys.argv
    or os.getenv("NSUT_HEADLESS", "").strip().lower() in {"1", "true", "yes"}
)

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


def wait_for_login(driver, timeout=120):
    """Poll the page to detect when the student has completed IMS login."""
    log("Waiting for IMS login to complete...")
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            driver.switch_to.default_content()
            for context in [""] + frame_names(driver):
                try:
                    if context:
                        driver.switch_to.frame(context)
                    links = driver.find_elements(By.TAG_NAME, "a")
                    for link in links:
                        if link.is_displayed() and clean(link.text).casefold() == "my activities":
                            log("IMS login detected!")
                            driver.switch_to.default_content()
                            return True
                except WebDriverException:
                    continue
        except WebDriverException:
            pass
        time.sleep(2)
    log("IMS login wait timed out.")
    return False


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


def main():
    chrome_options = webdriver.ChromeOptions()
    chrome_options.add_argument("--window-size=1360,860")
    chrome_options.add_argument("--disable-notifications")

    if HEADLESS_MODE:
        chrome_options.add_argument("--headless=new")
        chrome_options.add_argument("--disable-gpu")

    driver = webdriver.Chrome(options=chrome_options)

    if not HEADLESS_MODE:
        try:
            driver.maximize_window()
        except WebDriverException:
            pass
    try:
        # Step 1: Open IMS and click Student Login.
        log("Opening IMS and clicking Student Login...")
        click_student_login(driver)

        # Step 2: Wait for the student to log in manually.
        if AUTO_MODE:
            if not wait_for_login(driver):
                log("ERROR: Login not detected within timeout period.")
                return
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
            log("ERROR: Extraction failed. No attendance data found.")
            return

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
        log(f"ERROR: Something went wrong: {error}")
        if not AUTO_MODE:
            input("Press ENTER to close Chrome...")

    finally:
        driver.quit()


if __name__ == "__main__":
    main()