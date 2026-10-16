import type {
  AppNotification,
  AttendanceRecord,
  CampusEvent,
  Comment,
  Community,
  CommunityMember,
  Database,
  Exam,
  Material,
  Post,
  Report,
  Scholarship,
  Session,
  Slot,
  SyllabusSubject,
  Timetable,
  User,
  Vote,
} from "./types";
import { hashPassword } from "./password";

/**
 * Demo dataset.
 *
 * Everything produced here is SAMPLE CONTENT for development and demonstration.
 * It is clearly labelled as demo data inside the UI (see the "Demo data" badge
 * in the header). Replace it with real college records before production use.
 */

const HOUR = 3600_000;
const DAY = 24 * HOUR;

export const DEMO_ACCOUNTS = [
  { email: "student@campus.edu", password: "student123", label: "Student (Aarav)" },
  { email: "faculty@campus.edu", password: "faculty123", label: "Faculty (Dr. Meera Iyer)" },
  { email: "organizer@campus.edu", password: "organizer123", label: "Club organizer (Rohan)" },
  { email: "admin@campus.edu", password: "admin123", label: "Administrator" },
];

function user(
  id: string,
  name: string,
  username: string,
  email: string,
  role: User["role"],
  extra: Partial<User> = {},
): User {
  const { salt, hash } = hashPassword(
    role === "admin" ? "admin123" : role === "faculty" ? "faculty123" : role === "organizer" ? "organizer123" : "student123",
  );
  return {
    id,
    email,
    passwordHash: hash,
    salt,
    name,
    username,
    role,
    avatar: null,
    department: null,
    year: null,
    interests: [],
    bio: "",
    verified: true,
    createdAt: new Date(Date.now() - 300 * DAY).toISOString(),
    notificationPrefs: {
      replies: true,
      postInteractions: true,
      eventReminders: true,
      academic: true,
    },
    ...extra,
  };
}

export function buildSeedData(): Database {
  const t = Date.now();
  const ago = (ms: number) => new Date(t - ms).toISOString();
  const ahead = (ms: number) => new Date(t + ms).toISOString();

  // ----------------------------- users ----------------------------------
  const users: User[] = [
    user("u-aarav", "Aarav Sharma", "aarav", "student@campus.edu", "student", {
      department: "Computer Science & Engineering",
      year: "3rd Year",
      interests: ["Web Development", "Open Source", "Cricket"],
      bio: "Full-stack tinkerer, tech club convenor, always up for a hackathon.",
    }),
    user("u-priya", "Priya Nair", "priya", "priya@campus.edu", "student", {
      department: "Information Technology",
      year: "2nd Year",
      interests: ["UI Design", "Photography"],
      bio: "Design lead at the design club. I take too many photos of campus sunsets.",
    }),
    user("u-kabir", "Kabir Singh", "kabir", "kabir@campus.edu", "student", {
      department: "Mechanical Engineering",
      year: "3rd Year",
      interests: ["Robotics", "Formula Student"],
      bio: "Building cars and breaking them again.",
    }),
    user("u-ananya", "Ananya Rao", "ananya", "ananya@campus.edu", "student", {
      department: "Electronics & Communication",
      year: "4th Year",
      interests: ["VLSI", "Competitive Programming"],
      bio: "Placement season survivor. Ask me about interviews.",
    }),
    user("u-dev", "Dev Patel", "dev", "dev@campus.edu", "student", {
      department: "Computer Science & Engineering",
      year: "2nd Year",
      interests: ["Machine Learning", "Chess"],
      bio: "Learning ML one notebook at a time.",
    }),
    user("u-sneha", "Sneha Kulkarni", "sneha", "sneha@campus.edu", "student", {
      department: "Civil Engineering",
      year: "3rd Year",
      interests: ["Structural Design", "Dance"],
      bio: "Structures by day, dance floor by night.",
    }),
    user("u-arjun", "Arjun Menon", "arjun", "arjun@campus.edu", "student", {
      department: "Business Administration",
      year: "1st Year",
      interests: ["Marketing", "Debate"],
      bio: "First year, still figuring out the mess menu.",
    }),
    user("u-meera", "Dr. Meera Iyer", "meera", "faculty@campus.edu", "faculty", {
      department: "Computer Science & Engineering",
      interests: ["Distributed Systems", "Research"],
      bio: "Professor, CSE. Office hours: Tue & Thu, 3-5 PM.",
    }),
    user("u-rohan", "Rohan Verma", "rohan", "organizer@campus.edu", "organizer", {
      department: "Computer Science & Engineering",
      year: "4th Year",
      interests: ["Events", "Hackathons"],
      bio: "Robotics Club lead and campus event organizer.",
    }),
    user("u-admin", "Campus Administrator", "admin", "admin@campus.edu", "admin", {
      department: "Administration",
      bio: "Official college administrator account.",
    }),
  ];

  // ----------------------------- posts ----------------------------------
  // Which campus community each seeded post belongs to (Reddit-style groups).
  const POST_COMMUNITY: Record<string, string> = {
    "p-1": "cm-cse",
    "p-2": "cm-cse",
    "p-3": "cm-cse",
    "p-4": "cm-ece",
    "p-5": "cm-cse",
    "p-6": "cm-placement",
    "p-7": "cm-hostel",
    "p-8": "cm-cse",
    "p-9": "cm-freshers",
    "p-10": "cm-freshers",
    "p-11": "cm-hostel",
    "p-12": "cm-hostel",
  };

  const posts = ([
    {
      id: "p-1",
      authorId: "u-rohan",
      title: "HackFest 2026 registrations are open — 36 hours, ₹2L prize pool",
      body: "The biggest hackathon on campus is back. Build in teams of up to 4, ship a working demo, and pitch to judges from industry.\n\nThemes: AI for education, climate tech, developer tools, and open innovation.\n\nRegistration closes on the 25th and seats are limited to 120 participants. Meal coupons and swag included for all finalists.",
      category: "Announcement",
      media: [{ kind: "image", url: "/samples/hackfest.svg", name: "hackfest-banner.svg", size: 18432 }],
      createdAt: ago(2 * HOUR),
      upvotes: 142,
      downvotes: 3,
      commentCount: 4,
      removed: false,
    },
    {
      id: "p-2",
      authorId: "u-dev",
      title: "How do I actually understand dynamic programming?",
      body: "I can solve the easy LeetCode problems by memorising the pattern, but I don't really get when to use a memo table vs. tabulation. Everyone says \"just draw the recursion tree\" but my mind goes blank.\n\nWhat finally made it click for you?",
      category: "Question",
      media: [],
      createdAt: ago(5 * HOUR),
      upvotes: 67,
      downvotes: 1,
      commentCount: 5,
      removed: false,
    },
    {
      id: "p-3",
      authorId: "u-priya",
      title: "Free DSA revision sheet I made for mid-sems (7 pages, printable)",
      body: "I condensed the whole DSA course into a printable sheet: complexity cheat codes, graph traversal templates, common pitfalls, and the 20 patterns that showed up in the last 5 years of papers.\n\nLinked in the comments — happy to take corrections. Please don't repost it with your name on it 🙂",
      category: "Study Resources",
      media: [{ kind: "image", url: "/samples/dsa-sheet.svg", name: "dsa-sheet.svg", size: 24576 }],
      createdAt: ago(9 * HOUR),
      upvotes: 214,
      downvotes: 4,
      commentCount: 3,
      removed: false,
    },
    {
      id: "p-4",
      authorId: "u-kabir",
      title: "When the lab assistant says \"just restart the PCB\" and smoke comes out",
      body: "Third attempt at soldering the motor driver and my multimeter now reads a personal best of 0V and 4V at the same time. Weekend well spent.",
      category: "Memes",
      media: [{ kind: "image", url: "/samples/meme-lab.svg", name: "meme-lab.svg", size: 31200 }],
      createdAt: ago(14 * HOUR),
      upvotes: 331,
      downvotes: 6,
      commentCount: 4,
      removed: false,
    },
    {
      id: "p-5",
      authorId: "u-meera",
      title: "Official: DBMS internals guest lecture moved to Seminar Hall B",
      body: "Tomorrow's guest lecture by Dr. Anil Gupta has been shifted from Lecture Hall 4 to Seminar Hall B owing to a larger turnout. Same time, 2:00 PM.\n\nAttendance is compulsory for 4th year CSE students. Please carry your ID cards.",
      category: "Announcement",
      media: [],
      createdAt: ago(20 * HOUR),
      upvotes: 58,
      downvotes: 0,
      commentCount: 2,
      removed: false,
    },
    {
      id: "p-6",
      authorId: "u-ananya",
      title: "Placed! Here's everything I'd do differently for placement prep",
      body: "Cleared 6 companies this season. If I restart from scratch:\n\n1. Start aptitude prep in 2nd year, not 3 weeks before season.\n2. Solve 150 curated DSA problems instead of 600 random ones.\n3. Do 5 mock interviews out loud — speaking is a separate skill.\n4. Read the job description twice. Half the questions come straight from it.\n5. Sleep. Burnout cost me my first two interviews.\n\nHappy to review resumes in the comments.",
      category: "Campus Life",
      media: [],
      createdAt: ago(28 * HOUR),
      upvotes: 401,
      downvotes: 5,
      commentCount: 6,
      removed: false,
    },
    {
      id: "p-7",
      authorId: "u-sneha",
      title: "Mess menu this week is a crime against students",
      body: "Day 4 of the same paneer and I'm convinced it's the same paneer. Can we get a rotation chart posted somewhere? Genuinely asking the mess committee.",
      category: "Campus Life",
      media: [],
      createdAt: ago(32 * HOUR),
      upvotes: 189,
      downvotes: 12,
      commentCount: 3,
      removed: false,
    },
    {
      id: "p-8",
      authorId: "u-aarav",
      title: "Made an open-source timetable app for our college — looking for testers",
      body: "It pulls lab batches, shows free slots when you drop a class, and reminds you 15 minutes before. Built it because I missed two labs in one week.\n\nLooking for 10 testers from other branches to check if the slot logic holds outside CSE. Drop a comment and I'll share the repo link.",
      category: "Discussion",
      media: [],
      createdAt: ago(40 * HOUR),
      upvotes: 96,
      downvotes: 2,
      commentCount: 4,
      removed: false,
    },
    {
      id: "p-9",
      authorId: "u-arjun",
      title: "Is the college library open during the Diwali break?",
      body: "Group project deadline is on the 3rd and I'd rather not write it at home. Anyone knows the holiday hours for the central library?",
      category: "Question",
      media: [],
      createdAt: ago(46 * HOUR),
      upvotes: 23,
      downvotes: 0,
      commentCount: 2,
      removed: false,
    },
    {
      id: "p-10",
      authorId: "u-dev",
      title: "Explained: what the new attendance rule actually means for you",
      body: "Short version: 75% aggregate is still the cutoff, but now attendance is calculated per subject at the 60% mark of the semester instead of at the end.\n\nIf you're below 70% in any subject right now, treat it as a warning — there isn't enough semester left to recover in one subject if you skip everything else.",
      category: "Study Resources",
      media: [],
      createdAt: ago(2 * DAY),
      upvotes: 154,
      downvotes: 7,
      commentCount: 3,
      removed: false,
    },
    {
      id: "p-11",
      authorId: "u-priya",
      title: "The 3 AM study session in the AC gallery hits different",
      body: "Nobody talks about how the most honest conversations of the semester happen at 3 AM in the gallery, with cold coffee and a half-finished assignment.",
      category: "Memes",
      media: [{ kind: "image", url: "/samples/meme-night.svg", name: "meme-night.svg", size: 27800 }],
      createdAt: ago(3 * DAY),
      upvotes: 276,
      downvotes: 8,
      commentCount: 2,
      removed: false,
    },
    {
      id: "p-12",
      authorId: "u-kabir",
      title: "Hostel Wi-Fi has been down since morning — anyone else?",
      body: "Blocked on submitting the assignment portal. Tried resetting the router twice. Is there an alternate network we can use during outages?",
      category: "Discussion",
      media: [],
      createdAt: ago(4 * DAY),
      upvotes: 44,
      downvotes: 1,
      commentCount: 2,
      removed: false,
    },
  ] as Omit<Post, "communityId">[]).map((p) => ({ ...p, communityId: POST_COMMUNITY[p.id] ?? null }));

  // ---------------------------- comments ---------------------------------
  const comments: Comment[] = [
    c("c-1", "p-2", "u-aarav", null, "Draw the recursion tree once, then ask: which subproblems repeat? That repetition is exactly what a memo table stores. Once you see the repeats you stop thinking in patterns and start thinking in state.", 6 * HOUR, 58, 1),
    c("c-2", "p-2", "u-dev", "c-1", "The \"state\" framing helps. So I should ask what the function's arguments fully describe about the problem?", 5.4 * HOUR, 12, 0),
    c("c-3", "p-2", "u-aarav", "c-2", "Exactly. If (i, remaining) fully determines the answer, it's your memo key. I'll share a 30-line template tonight.", 5 * HOUR, 19, 0),
    c("c-4", "p-2", "u-ananya", null, "Top-down first, always. Write plain recursion, add a Map, then — only if you hit stack limits — convert to bottom-up. Most people skip straight to tabulation and get lost in the index juggling.", 4 * HOUR, 41, 2),
    c("c-5", "p-2", "u-dev", "c-4", "Noted, thank you! Trying knapsack tonight.", 3 * HOUR, 6, 0),

    c("c-6", "p-1", "u-aarav", null, "Is there a first-year track? Our team has two first-years who've never shipped a project.", 1.6 * HOUR, 22, 0),
    c("c-7", "p-1", "u-rohan", "c-6", "Absolutely — the rookie track has mentoring from 4th-years and a separate prize. Mention \"rookie\" in your registration form.", 1.2 * HOUR, 31, 0),
    c("c-8", "p-1", "u-priya", null, "Are design-only submissions allowed for the open innovation theme?", 1 * HOUR, 9, 0),
    c("c-9", "p-1", "u-rohan", "c-8", "Yes, if you include a clickable prototype and a validation plan.", 0.6 * HOUR, 14, 0),

    c("c-10", "p-4", "u-sneha", null, "The multimeter reading both 0V and 4V is genuinely the most relatable thing on this feed today.", 12 * HOUR, 88, 3),
    c("c-11", "p-4", "u-kabir", "c-10", "It's called innovation, look it up.", 11 * HOUR, 64, 1),
    c("c-12", "p-4", "u-dev", null, "Print this and paste it on the workshop wall.", 9 * HOUR, 27, 0),
    c("c-13", "p-4", "u-priya", null, "F for the board 🫡", 8 * HOUR, 35, 0),

    c("c-14", "p-3", "u-aarav", null, "This is better than the official notes. Section 4 alone fixed my graphs revision.", 7 * HOUR, 46, 0),
    c("c-15", "p-3", "u-dev", null, "Could you add sliding window templates too?", 6 * HOUR, 15, 0),
    c("c-16", "p-3", "u-priya", "c-15", "Adding them this weekend along with a heap section.", 5 * HOUR, 18, 0),

    c("c-17", "p-6", "u-dev", null, "Point 4 is so real. Half my prep went into companies I never read about properly.", 24 * HOUR, 52, 1),
    c("c-18", "p-6", "u-ananya", "c-17", "The JD is basically a cheat sheet. Good luck with your season!", 22 * HOUR, 21, 0),
    c("c-19", "p-6", "u-arjun", null, "Saving this for 2nd year. Resume review would be amazing 🙏", 20 * HOUR, 17, 0),

    c("c-20", "p-5", "u-aarav", null, "Will the lecture be recorded for students with a clash with DBMS lab?", 18 * HOUR, 12, 0),
    c("c-21", "p-5", "u-meera", "c-20", "Yes, it will be uploaded to Study Materials by evening.", 17 * HOUR, 24, 0),

    c("c-22", "p-8", "u-priya", null, "Sign me up as a tester — the electronics batch system is even messier.", 36 * HOUR, 25, 0),
    c("c-23", "p-8", "u-sneha", null, "Civil has a lab that alternates weeks. Would love to see how you handle that.", 34 * HOUR, 13, 0),

    c("c-24", "p-7", "u-arjun", null, "Petition for a roti counter that isn't closed by 8:40 PM.", 30 * HOUR, 44, 2),
    c("c-25", "p-12", "u-aarav", null, "Guest network \"Campus-Guest\" works during outages, it just throttles after 1 GB.", 3.6 * HOUR, 16, 0),
    c("c-26", "p-10", "u-sneha", null, "This should be pinned. The 60% checkpoint caught a lot of people off guard.", 1.7 * DAY, 38, 0),
    c("c-27", "p-9", "u-ananya", null, "Library stays open 9 AM–1 PM during break, closed on the 1st. Exam hall stays open till 6.", 44 * HOUR, 20, 0),
    c("c-28", "p-11", "u-kabir", null, "Frame it. This is the whole semester in one line.", 2.8 * DAY, 47, 1),
  ];

  // ------------------------------ votes ----------------------------------
  const votes: Vote[] = [
    v("u-aarav", "post", "p-1"),
    v("u-priya", "post", "p-3"),
    v("u-dev", "post", "p-3"),
    v("u-ananya", "post", "p-6"),
    v("u-kabir", "post", "p-4"),
    v("u-aarav", "comment", "c-1"),
    v("u-dev", "comment", "c-4"),
  ];

  // ----------------------------- events ----------------------------------
  const events: CampusEvent[] = [
    {
      id: "e-1",
      title: "HackFest 2026 — 36 Hour National Hackathon",
      description:
        "CampusConnect's flagship hackathon returns with 36 hours of building, mentoring and pitching. Teams of 1–4 compete across four themes: AI for education, climate technology, developer tools and open innovation. Industry mentors will be on floor through the night, and every team gets cloud credits.\n\nFinal pitches are judged by a panel of alumni and product engineers. Food, swag and a photo booth included.",
      category: "Hackathon",
      banner: "/samples/hackfest.svg",
      start: ahead(6 * DAY),
      end: ahead(7.5 * DAY),
      venue: "Innovation Centre & Main Auditorium",
      organizer: "Robotics Club & CSE Department",
      organizerId: "u-rohan",
      deadline: ahead(5 * DAY),
      seats: 120,
      eligibility:
        "Open to all enrolled students. Teams of up to 4. First-year students must join the rookie track with a mentor.",
      instructions:
        "Carry your college ID card and laptop. Registration closes when seats fill or on the deadline, whichever is earlier. Teams must be present for the opening ceremony at 9:00 AM.",
      registrationUrl: "https://example.edu/hackfest2026/register",
      createdBy: "u-rohan",
      createdAt: ago(3 * DAY),
      published: true,
      related: ["Scholarship applications for conference travel close this week", "Library extends hours during HackFest"],
    },
    {
      id: "e-2",
      title: "Git & GitHub for Beginners — Hands-on Workshop",
      description:
        "Stop copy-pasting code over WhatsApp. In this 2-hour hands-on session you will learn branching, pull requests, merge conflicts and how we review code in the department's clubs.\n\nBring a laptop with Git installed. We will work in pairs on a real repository and finish with everyone having merged their first PR.",
      category: "Technical Workshop",
      banner: "/samples/workshop.svg",
      start: ahead(2 * DAY),
      end: ahead(2 * DAY + 2 * HOUR),
      venue: "Lab 204, CSE Block",
      organizer: "Open Source Club",
      organizerId: "u-rohan",
      deadline: ahead(2 * DAY),
      seats: 40,
      eligibility: "Open to all years and branches. No prior Git experience needed.",
      instructions: "Install Git before the session. Lab machines are available if you cannot bring a laptop.",
      registrationUrl: "https://example.edu/opengit/register",
      createdBy: "u-rohan",
      createdAt: ago(5 * DAY),
      published: true,
      related: ["Follow-up: intermediate Git session next month"],
    },
    {
      id: "e-3",
      title: "Campus Placements 101 — Resume Clinic with Alumni",
      description:
        "A practical session on building a resume that survives the first shortlist. Alumni from five companies will review resumes on the spot and run a mock HR round.\n\nCarry 5 printed copies. First-come, first-reviewed.",
      category: "Placement & Career",
      banner: "/samples/placement.svg",
      start: ahead(4 * DAY),
      end: ahead(4 * DAY + 3 * HOUR),
      venue: "Seminar Hall A",
      organizer: "Training & Placement Cell",
      organizerId: "u-admin",
      deadline: ahead(3 * DAY),
      seats: 90,
      eligibility: "3rd and 4th year students only.",
      instructions: "Bring a printed resume and a copy of your academic transcript. Formal attire recommended for the mock round.",
      registrationUrl: "https://example.edu/placement101",
      createdBy: "u-admin",
      createdAt: ago(4 * DAY),
      published: true,
      related: ["Placement season begins November 2"],
    },
    {
      id: "e-4",
      title: "Spandan — Annual Cultural Festival",
      description:
        "Three days of music, dance, drama and art. This year's headliners include two independent bands and a professional stand-up set.\n\nSub-events: solo singing, street play, fashion walk, short film, and the inter-college battle of bands.",
      category: "Cultural Festival",
      banner: "/samples/spandan.svg",
      start: ahead(18 * DAY),
      end: ahead(21 * DAY),
      venue: "Open Air Theatre & Main Auditorium",
      organizer: "Cultural Committee",
      organizerId: "u-admin",
      deadline: ahead(15 * DAY),
      seats: null,
      eligibility: "Open to all students of the college and invited neighbouring colleges for inter-college events.",
      instructions: "Auditions for solo events are on the first day. Entry to headliner nights requires a festival wristband.",
      registrationUrl: "https://example.edu/spandan",
      createdBy: "u-admin",
      createdAt: ago(8 * DAY),
      published: true,
      related: ["Volunteer registrations are open", "Bus timings will be extended on all three days"],
    },
    {
      id: "e-5",
      title: "Inter-Batch Cricket Cup — Finals",
      description:
        "The final of the intramural cricket cup. Eight batches, one trophy. Come support your batch — the dressing room chants matter more than you think.",
      category: "Sports",
      banner: "/samples/cricket.svg",
      start: ahead(9 * DAY),
      end: ahead(9 * DAY + 5 * HOUR),
      venue: "Main Ground, Hostel Side",
      organizer: "Sports Council",
      organizerId: "u-admin",
      deadline: null,
      seats: null,
      eligibility: "Spectators welcome. Playing squads are finalised by batch captains.",
      instructions: "Please use the designated spectator area. Ground closes at 6:30 PM.",
      registrationUrl: "",
      createdBy: "u-admin",
      createdAt: ago(6 * DAY),
      published: true,
      related: ["Prize distribution follows immediately"],
    },
    {
      id: "e-6",
      title: "Guest Lecture: Debugging Distributed Systems",
      description:
        "Dr. Anil Gupta (Principal Engineer, cloud infrastructure) walks through three real production incidents and the reasoning used to isolate them.\n\nExpect a deep dive into observability, partial failures and why your retry logic is probably making things worse.",
      category: "Guest Lecture",
      banner: "/samples/lecture.svg",
      start: ahead(1 * DAY),
      end: ahead(1 * DAY + 1.5 * HOUR),
      venue: "Seminar Hall B",
      organizer: "CSE Department",
      organizerId: "u-meera",
      deadline: null,
      seats: 150,
      eligibility: "3rd and 4th year students. Open to faculty.",
      instructions: "Attendance is compulsory for 4th year CSE students. Carry your ID card.",
      registrationUrl: "",
      createdBy: "u-meera",
      createdAt: ago(2 * DAY),
      published: true,
      related: ["Recording will be uploaded to Study Materials"],
    },
    {
      id: "e-7",
      title: "Rotaract Blood Donation Camp",
      description:
        "In collaboration with the district hospital blood centre. A brief health check is done before donation and refreshments are provided afterwards.",
      category: "Club Activity",
      banner: "/samples/blood.svg",
      start: ahead(11 * DAY),
      end: ahead(11 * DAY + 4 * HOUR),
      venue: "College Health Centre",
      organizer: "Rotaract Club",
      organizerId: "u-sneha",
      deadline: ahead(10 * DAY),
      seats: 200,
      eligibility: "Students and staff aged 18+ weighing above 50 kg. Carry a photo ID.",
      instructions: "Eat a light meal before donating. Avoid heavy exertion for the rest of the day.",
      registrationUrl: "https://example.edu/rotaract/donate",
      createdBy: "u-sneha",
      createdAt: ago(7 * DAY),
      published: true,
      related: ["Certificates provided to all donors"],
    },
    {
      id: "e-8",
      title: "Robotics League — Line Follower Challenge",
      description:
        "Build an autonomous line-following robot and race it on our track. Components available at the club store for registered teams.\n\nTimed qualifying runs in the morning, knockouts in the afternoon.",
      category: "Competition",
      banner: "/samples/robotics.svg",
      start: ahead(14 * DAY),
      end: ahead(14 * DAY + 6 * HOUR),
      venue: "Workshop Floor, Mechanical Block",
      organizer: "Robotics Club",
      organizerId: "u-rohan",
      deadline: ahead(12 * DAY),
      seats: 24,
      eligibility: "Teams of 2–3. All branches welcome.",
      instructions: "Robot must fit within 25×25 cm. Kit loans close 3 days before the event.",
      registrationUrl: "https://example.edu/robotics-league",
      createdBy: "u-rohan",
      createdAt: ago(10 * DAY),
      published: true,
      related: ["Kit orientation session the evening before"],
    },
    {
      id: "e-9",
      title: "Alumni Talk: Life After the First Job",
      description:
        "Four alumni from very different paths — a startup engineer, a civil servant, a designer and a founder — talk honestly about the first two years after graduation.",
      category: "Seminar",
      banner: "/samples/alumni.svg",
      start: ahead(25 * DAY),
      end: ahead(25 * DAY + 2 * HOUR),
      venue: "Main Auditorium",
      organizer: "Alumni Cell",
      organizerId: "u-admin",
      deadline: ahead(24 * DAY),
      seats: 300,
      eligibility: "Open to all students.",
      instructions: "Seating is unreserved. Please arrive 10 minutes early.",
      registrationUrl: "",
      createdBy: "u-admin",
      createdAt: ago(12 * DAY),
      published: true,
      related: ["Mentorship sign-ups open the same day"],
    },
  ];

  const registrations = [
    r("reg-1", "e-1", "u-aarav"),
    r("reg-2", "e-2", "u-aarav"),
    r("reg-3", "e-3", "u-aarav"),
    r("reg-4", "e-1", "u-dev"),
    r("reg-5", "e-2", "u-priya"),
    r("reg-6", "e-6", "u-ananya"),
    r("reg-7", "e-4", "u-sneha"),
  ];

  // --------------------------- communities -------------------------------
  const communities: Community[] = [
    { id: "cm-cse", name: "Computer Science & Engineering", slug: "CSE", description: "Coding, labs, DBMS woes and everything CS.", members: 1284, icon: "code", tone: "brand" },
    { id: "cm-ece", name: "Electronics & Communication", slug: "ECE", description: "PCBs, signals and questionable soldering.", members: 862, icon: "cpu", tone: "sky" },
    { id: "cm-mech", name: "Mechanical Engineering", slug: "MECH", description: "Workshops, CAD and formula cars.", members: 741, icon: "wrench", tone: "amber" },
    { id: "cm-freshers", name: "First Year Forum", slug: "FRESHERS", description: "Orientation, add/drop and surviving the first semester.", members: 1520, icon: "sparkles", tone: "violet" },
    { id: "cm-placement", name: "Placement Cell", slug: "PLACEMENT", description: "Interview prep, resumes and offer talk.", members: 996, icon: "briefcase", tone: "accent" },
    { id: "cm-memes", name: "Memes of Campus", slug: "MEMES", description: "Only the finest batch-war memes.", members: 2103, icon: "laugh", tone: "rose" },
    { id: "cm-hostel", name: "Hostel Life", slug: "HOSTEL", description: "Mess menu complaints and 3 AM stories.", members: 1147, icon: "home", tone: "brand" },
    { id: "cm-sports", name: "Sports & Fitness", slug: "SPORTS", description: "Courts, grounds, cycles and gym updates.", members: 638, icon: "dumbbell", tone: "accent" },
  ];

  const communityMembers: CommunityMember[] = [
    m("u-aarav", "cm-cse"),
    m("u-aarav", "cm-placement"),
    m("u-aarav", "cm-memes"),
    m("u-dev", "cm-cse"),
    m("u-priya", "cm-memes"),
    m("u-kabir", "cm-mech"),
    m("u-ananya", "cm-placement"),
    m("u-sneha", "cm-hostel"),
    m("u-rohan", "cm-cse"),
    m("u-meera", "cm-cse"),
  ];

  // -------------------------- academic data ------------------------------
  const syllabus: SyllabusSubject[] = [
    syl("sy-1", "Computer Science & Engineering", "Semester 5", "Database Management Systems", "CS501", 4, [
      { title: "Unit I — Relational Model", topics: ["ER to relational mapping", "Relational algebra", "Tuple and domain calculus", "SQL basics"] },
      { title: "Unit II — Design & Normalization", topics: ["Functional dependencies", "Armstrong's axioms", "BCNF, 3NF, 4NF", "Lossless join and dependency preservation"] },
      { title: "Unit III — Transactions", topics: ["ACID properties", "Conflict and view serializability", "Recoverability", "Two-phase locking", "Timestamp ordering"] },
      { title: "Unit IV — Concurrency Control", topics: ["Deadlock handling", "Checkpointing", "ARIES overview", "Failure recovery"] },
      { title: "Unit V — Query Processing & Modern Stores", topics: ["Query optimization", "Indexing strategies", "NoSQL and key-value stores", "CAP theorem"] },
    ], "u-meera"),
    syl("sy-2", "Computer Science & Engineering", "Semester 5", "Design & Analysis of Algorithms", "CS502", 4, [
      { title: "Unit I — Foundations", topics: ["Asymptotic analysis", "Recurrences — substitution, master theorem", "Divide and conquer"] },
      { title: "Unit II — Greedy Methods", topics: ["Huffman coding", "Activity selection", "Matroid theory basics", "Kruskal and Prim"] },
      { title: "Unit III — Dynamic Programming", topics: ["0/1 knapsack", "LCS and edit distance", "Matrix chain multiplication", "Bellman-Ford"] },
      { title: "Unit IV — Graph Algorithms", topics: ["Flow networks", "Max-flow min-cut", "Matching", "NP-completeness"] },
      { title: "Unit V — Advanced Topics", topics: ["Approximation algorithms", "Randomized algorithms", "Branch and bound"] },
    ], "u-meera"),
    syl("sy-3", "Computer Science & Engineering", "Semester 5", "Computer Networks", "CS503", 3, [
      { title: "Unit I — Foundations", topics: ["OSI and TCP/IP models", "Circuit vs packet switching", "Delay, loss and throughput"] },
      { title: "Unit II — Data Link Layer", topics: ["Framing", "Error detection and correction", "Sliding window protocols", "Ethernet and Wi-Fi"] },
      { title: "Unit III — Network Layer", topics: ["IPv4 and subnetting", "Routing — RIP, OSPF, BGP", "NAT", "ICMP"] },
      { title: "Unit IV — Transport Layer", topics: ["TCP congestion control", "UDP", "Handshakes and timers"] },
      { title: "Unit V — Application Layer", topics: ["DNS", "HTTP/HTTPS", "Email", "Socket programming"] },
    ], "u-meera"),
    syl("sy-4", "Computer Science & Engineering", "Semester 5", "Operating Systems", "CS504", 4, [
      { title: "Unit I — Processes & Threads", topics: ["Process states", "Scheduling algorithms", "Context switching", "Threads and user-space threads"] },
      { title: "Unit II — Concurrency", topics: ["Mutexes and semaphores", "Producer-consumer", "Readers-writers", "Deadlock — banker's algorithm"] },
      { title: "Unit III — Memory Management", topics: ["Paging and segmentation", "Page replacement — LRU, OPT", "Thrashing", "Working set model"] },
      { title: "Unit IV — File & I/O Systems", topics: ["File allocation", "Directory structures", "Disk scheduling", "RAID"] },
      { title: "Unit V — Virtualisation", topics: ["Virtual machines", "Containers", "Hypervisors", "Case study: Linux"] },
    ], "u-meera"),
    syl("sy-5", "Information Technology", "Semester 3", "Data Structures & Algorithms", "IT301", 4, [
      { title: "Unit I — Linear Structures", topics: ["Arrays and linked lists", "Stacks and queues", "Applications of stacks"] },
      { title: "Unit II — Trees", topics: ["Binary trees and traversals", "BST, AVL", "Heaps and priority queues", "B-trees"] },
      { title: "Unit III — Hashing & Graphs", topics: ["Hash tables", "Graph representations", "BFS and DFS", "Shortest paths"] },
      { title: "Unit IV — Sorting & Searching", topics: ["Quicksort and mergesort", "Counting sort", "Binary search variants"] },
      { title: "Unit V — Complexity", topics: ["P and NP", "Amortized analysis", "Greedy vs DP"] },
    ], "u-meera"),
    syl("sy-6", "Computer Science & Engineering", "Semester 3", "Object Oriented Programming", "CS302", 4, [
      { title: "Unit I — Basics", topics: ["Classes and objects", "Constructors", "Encapsulation"] },
      { title: "Unit II — Inheritance & Polymorphism", topics: ["Method overriding", "Abstract classes", "Interfaces", "Dynamic dispatch"] },
      { title: "Unit III — Advanced", topics: ["Exception handling", "Generics", "Collections framework"] },
      { title: "Unit IV — Java Ecosystem", topics: ["File I/O", "Multithreading basics", "Lambdas and streams"] },
      { title: "Unit V — Design", topics: ["SOLID principles", "Design patterns — singleton, factory, observer"] },
    ], "u-meera"),
  ];

  const scholarships: Scholarship[] = [
    {
      id: "sc-1",
      name: "Merit-cum-Means Scholarship (State Government)",
      provider: "State Higher Education Department",
      eligibility: "Family income below ₹4.5 LPA, minimum 60% in the previous examination, regular attendance record.",
      amount: "₹25,000 per year + tuition reimbursement",
      deadline: ahead(18 * DAY),
      documents: ["Income certificate", "Fee receipt", "Previous semester marksheet", "Aadhaar", "Bank passbook"],
      applyUrl: "https://example.gov.in/scholarships/merit-means",
      description:
        "State scholarship for economically weaker sections. Disbursed directly to the student's bank account in two instalments after verification by the college nodal officer.",
      source: "Official",
      updatedAt: ago(2 * DAY),
    },
    {
      id: "sc-2",
      name: "Inspire Scholarship (Science & Technology)",
      provider: "Department of Science & Technology",
      eligibility: "Top 1% in Class 12 board examination, or within top 10,000 in JEE/NEET. Enrolled in a natural or applied science programme.",
      amount: "₹80,000 per year for 5 years",
      deadline: ahead(9 * DAY),
      documents: ["Class 12 marksheet", "JEE/NEET rank letter", "Enrolment proof", "Bank details", "Photograph"],
      applyUrl: "https://example.gov.in/inspire",
      description: "Prestigious central scholarship supporting students pursuing science and research careers.",
      source: "Official",
      updatedAt: ago(6 * DAY),
    },
    {
      id: "sc-3",
      name: "Internal Hardship & Merit Fund",
      provider: "College Trust",
      eligibility: "Any enrolled student facing genuine financial hardship, or securing a department rank in the previous semester.",
      amount: "₹5,000 – ₹20,000 (one time)",
      deadline: ahead(30 * DAY),
      documents: ["Application form", "Hardship declaration", "Semester marksheet", "Guardian's income declaration"],
      applyUrl: "https://example.edu/scholarship/trust-fund",
      description: "Discretionary fund administered by the student welfare committee. Applications are reviewed monthly.",
      source: "Official",
      updatedAt: ago(1 * DAY),
    },
    {
      id: "sc-4",
      name: "Girls in STEM Travel Grant",
      provider: "Women in Computing Society",
      eligibility: "Women students in 2nd–4th year of a STEM programme presenting a paper or project at a recognised conference.",
      amount: "Up to ₹40,000 toward travel",
      deadline: ahead(45 * DAY),
      documents: ["Acceptance letter", "Abstract", "Fee structure", "Recommendation from a faculty member"],
      applyUrl: "https://example.org/wics/travel-grant",
      description: "Covers travel, accommodation and registration for conferences. Rolling decisions every quarter.",
      source: "Official",
      updatedAt: ago(14 * DAY),
    },
    {
      id: "sc-5",
      name: "Crowdfunded Books Fund (student submitted)",
      provider: "Student Welfare Board (community listing)",
      eligibility: "Any student who cannot afford prescribed textbooks this semester.",
      amount: "Up to ₹3,000 in bookstore credit",
      deadline: ahead(6 * DAY),
      documents: ["Book list with prices", "One paragraph explaining need"],
      applyUrl: "https://example.edu/forums/books-fund",
      description:
        "Listed by a student moderator. UNVERIFIED by the college office — confirm with the student welfare committee before sharing documents.",
      source: "Community",
      updatedAt: ago(3 * DAY),
    },
  ];

  const attendance: AttendanceRecord[] = [
    at("at-1", "u-aarav", "Database Management Systems", "CS501", 42, 38, 75),
    at("at-2", "u-aarav", "Design & Analysis of Algorithms", "CS502", 40, 33, 75),
    at("at-3", "u-aarav", "Computer Networks", "CS503", 36, 24, 75),
    at("at-4", "u-aarav", "Operating Systems", "CS504", 42, 35, 75),
    at("at-5", "u-aarav", "Software Engineering", "CS505", 38, 36, 75),
    at("at-6", "u-aarav", "Computer Networks Lab", "CS503L", 18, 12, 75),
  ];

  const timetables: Timetable[] = [buildTimetable("tt-cse-3", "Computer Science & Engineering", "3rd Year", "u-meera")];

  const materials: Material[] = [
    mat("m-1", "Computer Science & Engineering", "Semester 5", "Database Management Systems", "DBMS Unit 1–3 Notes (Handwritten)", "Notes", 4.2, "u-meera", 12 * DAY),
    mat("m-2", "Computer Science & Engineering", "Semester 5", "Database Management Systems", "DBMS Previous Year Paper — 2025", "Previous Year Paper", 1.1, "u-meera", 40 * DAY),
    mat("m-3", "Computer Science & Engineering", "Semester 5", "Design & Analysis of Algorithms", "Algorithms Formula Sheet", "Notes", 0.6, "u-meera", 8 * DAY),
    mat("m-4", "Computer Science & Engineering", "Semester 5", "Operating Systems", "OS Lab Manual — 12 Experiments", "Lab Manual", 3.4, "u-meera", 20 * DAY),
    mat("m-5", "Computer Science & Engineering", "Semester 5", "Operating Systems", "Assignment 2 — Deadlock & Scheduling", "Assignment", 0.4, "u-meera", 2 * DAY),
    mat("m-6", "Computer Science & Engineering", "Semester 5", "Computer Networks", "CN Slides — Transport Layer", "Notes", 5.8, "u-meera", 6 * DAY),
    mat("m-7", "Computer Science & Engineering", "Semester 5", "Design & Analysis of Algorithms", "Introduction to Algorithms (CLRS) — Chapters 1–3", "Reference", 12.5, "u-meera", 60 * DAY),
    mat("m-8", "Information Technology", "Semester 3", "Data Structures & Algorithms", "DSA Problem Set with Solutions", "Notes", 2.2, "u-meera", 15 * DAY),
    mat("m-9", "Computer Science & Engineering", "Semester 5", "Computer Networks", "CN Previous Year Paper — 2024 & 2025", "Previous Year Paper", 1.8, "u-meera", 30 * DAY),
    mat("m-10", "Computer Science & Engineering", "Semester 5", "Database Management Systems", "DBMS Mini Project Rubric", "Assignment", 0.3, "u-meera", 3 * DAY),
  ];

  const exams: Exam[] = [
    {
      id: "ex-1",
      name: "End Semester Examination — Even Sem",
      subject: "Database Management Systems",
      code: "CS501",
      date: ahead(24 * DAY),
      startTime: "09:30",
      endTime: "12:30",
      venue: "Exam Block A, Rows 1–12",
      type: "Semester",
      instructions: "Reporting time 09:00. Non-programmable calculators allowed. Mobile phones must be surrendered at the desk.",
      important: true,
    },
    {
      id: "ex-2",
      name: "End Semester Examination — Even Sem",
      subject: "Design & Analysis of Algorithms",
      code: "CS502",
      date: ahead(27 * DAY),
      startTime: "09:30",
      endTime: "12:30",
      venue: "Exam Block A, Rows 13–24",
      type: "Semester",
      instructions: "Bring your college ID. Scribble sheets are provided; no loose paper allowed.",
      important: true,
    },
    {
      id: "ex-3",
      name: "End Semester Examination — Even Sem",
      subject: "Computer Networks",
      code: "CS503",
      date: ahead(30 * DAY),
      startTime: "14:00",
      endTime: "17:00",
      venue: "Exam Block B",
      type: "Semester",
      instructions: "Afternoon session — please verify your roll number on the seating chart outside Block B.",
      important: false,
    },
    {
      id: "ex-4",
      name: "Internal Assessment 2",
      subject: "Operating Systems",
      code: "CS504",
      date: ahead(8 * DAY),
      startTime: "10:00",
      endTime: "11:00",
      venue: "Lecture Hall 4",
      type: "Internal",
      instructions: "Covers Units I–III. 20 marks, no negative marking. Pen and pencil only.",
      important: true,
    },
    {
      id: "ex-5",
      name: "Operating Systems Lab Examination",
      subject: "Operating Systems Lab",
      code: "CS504L",
      date: ahead(16 * DAY),
      startTime: "11:00",
      endTime: "13:00",
      venue: "Lab 206",
      type: "Lab",
      instructions: "Two experiments, 15 marks each. Viva immediately after the experiment.",
      important: false,
    },
    {
      id: "ex-6",
      name: "Supplementary Examination",
      subject: "Discrete Mathematics (Backlog)",
      code: "CS201",
      date: ahead(40 * DAY),
      startTime: "09:30",
      endTime: "12:30",
      venue: "Exam Block C",
      type: "Backlog",
      instructions: "Only for students with an approved backlog. Hall ticket must be collected from the exam cell.",
      important: false,
    },
  ];

  // -------------------------- notifications ------------------------------
  const notifications: AppNotification[] = [
    n("n-1", "*", "academic", "End Semester timetable published", "The end semester examination timetable for Even Sem is now available in the Exam Schedule dashboard.", "/academics/exam-schedule", true, ago(3 * HOUR)),
    n("n-2", "*", "academic", "Attendance below 75% in Computer Networks", "Students below the minimum attendance in CS503 must contact their class mentor before the 60% semester checkpoint.", "/academics/attendance", true, ago(1 * DAY)),
    n("n-3", "*", "academic", "Assignment deadline — OS Assignment 2", "Operating Systems Assignment 2 is due on the portal by 11:55 PM, Friday.", "/academics/study-materials", false, ago(2 * DAY)),
    n("n-4", "*", "event_reminder", "HackFest 2026 starts soon", "Registrations close in 5 days. 96 of 120 seats are already taken.", "/events/e-1", false, ago(5 * HOUR)),
    n("n-5", "*", "academic", "Class cancellation — Civil Elective", "Thursday's Civil Elective lecture stands cancelled due to a faculty meeting.", "/academics/timetable", false, ago(1 * DAY)),
    n("n-6", "*", "academic", "Scholarship deadline approaching", "The state Merit-cum-Means scholarship window closes in 18 days.", "/academics/scholarships", false, ago(2 * DAY)),
    n("n-7", "*", "system", "Welcome to CampusConnect", "Your account has been verified with your college email. Complete your profile to appear in student search.", "/profile", false, ago(6 * DAY)),
    n("n-8", "u-aarav", "reply", "Priya replied to your comment", "\"Adding them this weekend along with a heap section.\"", "/posts/p-3", false, ago(5 * HOUR)),
    n("n-9", "u-aarav", "event_registration", "Registration confirmed — Git & GitHub Workshop", "You are registered for the workshop on the 2nd. Lab 204, 2:00 PM.", "/events/e-2", false, ago(2 * DAY)),
    n("n-10", "u-aarav", "post_interaction", "Your post is trending", "\"Made an open-source timetable app for our college\" crossed 90 upvotes.", "/posts/p-8", false, ago(1 * DAY)),
    n("n-11", "u-rohan", "moderation", "Your post was reported", "A report was filed against one of your comments. Review it in the moderation dashboard.", "/admin", true, ago(6 * HOUR)),
  ];

  const reports: Report[] = [
    {
      id: "rp-1",
      target: "post",
      targetId: "p-12",
      reporterId: "u-ananya",
      reason: "Spam",
      details: "Looks like it was posted three times in an hour.",
      status: "open",
      createdAt: ago(6 * HOUR),
      resolution: null,
      resolvedBy: null,
    },
    {
      id: "rp-2",
      target: "comment",
      targetId: "c-24",
      reporterId: "u-arjun",
      reason: "Harassment or bullying",
      details: "Reply in this thread got personal.",
      status: "open",
      createdAt: ago(4 * HOUR),
      resolution: null,
      resolvedBy: null,
    },
  ];

  return {
    version: 1,
    users,
    sessions: [] as Session[],
    resets: [],
    communities,
    communityMembers,
    posts,
    comments,
    votes,
    reports,
    events,
    registrations,
    notifications,
    reads: [
      { userId: "u-aarav", notificationId: "n-7" },
      { userId: "u-aarav", notificationId: "n-9" },
      { userId: "u-aarav", notificationId: "n-10" },
    ],
    syllabus,
    scholarships,
    attendance,
    timetables,
    materials,
    exams,
  };
}

// ---------------------------- helpers -------------------------------------

function c(
  id: string,
  postId: string,
  authorId: string,
  parentId: string | null,
  body: string,
  ageMs: number,
  up: number,
  down: number,
): Comment {
  return {
    id,
    postId,
    authorId,
    parentId,
    body,
    createdAt: new Date(Date.now() - ageMs).toISOString(),
    upvotes: up,
    downvotes: down,
    removed: false,
  };
}

function v(userId: string, target: Vote["target"], targetId: string): Vote {
  return { userId, target, targetId, value: 1, createdAt: new Date(Date.now() - 3600_000).toISOString() };
}

function r(id: string, eventId: string, userId: string) {
  return { id, eventId, userId, status: "registered" as const, createdAt: new Date(Date.now() - 86_400_000).toISOString() };
}

function m(userId: string, communityId: string): CommunityMember {
  return {
    id: `cmem-${userId}-${communityId}`,
    userId,
    communityId,
    joinedAt: new Date(Date.now() - 60 * 86_400_000).toISOString(),
  };
}

function syl(
  id: string,
  department: string,
  semester: string,
  subject: string,
  code: string,
  credits: number,
  units: { title: string; topics: string[] }[],
  uploadedBy: string,
): SyllabusSubject {
  return {
    id,
    department,
    semester,
    subject,
    code,
    credits,
    units,
    docUrl: `/api/download?type=syllabus&id=${id}`,
    updatedAt: new Date(Date.now() - 10 * 86_400_000).toISOString(),
    uploadedBy,
  };
}

function at(id: string, studentId: string, subject: string, code: string, conducted: number, attended: number, minRequired: number): AttendanceRecord {
  return { id, studentId, subject, code, conducted, attended, minRequired, updatedAt: new Date(Date.now() - 3600_000).toISOString() };
}

function mat(
  id: string,
  department: string,
  semester: string,
  subject: string,
  title: string,
  type: Material["type"],
  mb: number,
  uploadedBy: string,
  ageMs: number,
): Material {
  return {
    id,
    department,
    semester,
    subject,
    title,
    type,
    url: `/api/download?type=material&id=${id}`,
    size: Math.round(mb * 1024 * 1024),
    downloads: Math.floor(mb * 37) % 240,
    uploadedBy,
    createdAt: new Date(Date.now() - ageMs).toISOString(),
  };
}

function n(
  id: string,
  userId: string,
  type: AppNotification["type"],
  title: string,
  body: string,
  link: string | null,
  important: boolean,
  createdAt: string,
): AppNotification {
  return { id, userId, type, title, body, link, important, createdAt };
}

/** Builds a realistic Mon–Sat timetable for a final-year-style engineering batch. */
function buildTimetable(id: string, department: string, year: string, uploadedBy: string): Timetable {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
  const grid: { subject: string; faculty: string; room: string; kind: "class" | "lab" }[][] = [
    [
      { subject: "Database Management Systems", faculty: "Dr. Meera Iyer", room: "LH 4", kind: "class" },
      { subject: "Design & Analysis of Algorithms", faculty: "Prof. S. Krishnan", room: "LH 4", kind: "class" },
      { subject: "DBMS Lab", faculty: "Dr. Meera Iyer", room: "Lab 204", kind: "lab" },
      { subject: "Operating Systems", faculty: "Prof. R. Das", room: "LH 4", kind: "class" },
      { subject: "Computer Networks", faculty: "Dr. Meera Iyer", room: "LH 4", kind: "class" },
    ],
    [
      { subject: "Operating Systems", faculty: "Prof. R. Das", room: "LH 4", kind: "class" },
      { subject: "Computer Networks", faculty: "Dr. Meera Iyer", room: "LH 4", kind: "class" },
      { subject: "Technical Seminar", faculty: "Prof. S. Krishnan", room: "Seminar Hall B", kind: "class" },
      { subject: "Algorithms Lab", faculty: "Prof. S. Krishnan", room: "Lab 206", kind: "lab" },
      { subject: "Algorithms Lab", faculty: "Prof. S. Krishnan", room: "Lab 206", kind: "lab" },
    ],
    [
      { subject: "Database Management Systems", faculty: "Dr. Meera Iyer", room: "LH 4", kind: "class" },
      { subject: "Operating Systems", faculty: "Prof. R. Das", room: "LH 4", kind: "class" },
      { subject: "Computer Networks", faculty: "Dr. Meera Iyer", room: "LH 4", kind: "class" },
      { subject: "Software Engineering", faculty: "Prof. A. Nair", room: "LH 4", kind: "class" },
      { subject: "Design & Analysis of Algorithms", faculty: "Prof. S. Krishnan", room: "LH 4", kind: "class" },
    ],
    [
      { subject: "Design & Analysis of Algorithms", faculty: "Prof. S. Krishnan", room: "LH 4", kind: "class" },
      { subject: "Database Management Systems", faculty: "Dr. Meera Iyer", room: "LH 4", kind: "class" },
      { subject: "OS Lab", faculty: "Prof. R. Das", room: "Lab 206", kind: "lab" },
      { subject: "OS Lab", faculty: "Prof. R. Das", room: "Lab 206", kind: "lab" },
      { subject: "Software Engineering", faculty: "Prof. A. Nair", room: "LH 4", kind: "class" },
    ],
    [
      { subject: "Computer Networks", faculty: "Dr. Meera Iyer", room: "LH 4", kind: "class" },
      { subject: "Software Engineering", faculty: "Prof. A. Nair", room: "LH 4", kind: "class" },
      { subject: "Mentor Hour", faculty: "Dr. Meera Iyer", room: "Faculty Cabin 12", kind: "class" },
      { subject: "Database Management Systems", faculty: "Dr. Meera Iyer", room: "LH 4", kind: "class" },
      { subject: "Sports Hour", faculty: "Sports Council", room: "Main Ground", kind: "class" },
    ],
    [
      { subject: "Operating Systems", faculty: "Prof. R. Das", room: "LH 4", kind: "class" },
      { subject: "Design & Analysis of Algorithms", faculty: "Prof. S. Krishnan", room: "LH 4", kind: "class" },
      { subject: "CN Lab", faculty: "Dr. Meera Iyer", room: "Lab 204", kind: "lab" },
      { subject: "Library & Project Work", faculty: "—", room: "Central Library", kind: "class" },
      { subject: "Library & Project Work", faculty: "—", room: "Central Library", kind: "class" },
    ],
  ];
  const times = [
    ["09:00", "10:00"],
    ["10:00", "11:00"],
    ["11:15", "12:15"],
    ["13:15", "14:15"],
    ["14:15", "15:15"],
  ];

  const slots = days.flatMap((day, di) => {
    const list: Slot[] = grid[di].map((entry, si) => ({
      id: `${id}-${di}-${si}`,
      day,
      start: times[si][0],
      end: times[si][1],
      subject: entry.subject,
      faculty: entry.faculty,
      room: entry.room,
      kind: entry.kind,
    }));
    // Breaks are inserted as explicit slots so the UI can render them.
    list.splice(2, 0, {
      id: `${id}-${di}-break`,
      day,
      start: "11:00",
      end: "11:15",
      subject: "Short Break",
      faculty: "—",
      room: "Cafeteria",
      kind: "break" as const,
    });
    list.splice(3, 0, {
      id: `${id}-${di}-lunch`,
      day,
      start: "12:15",
      end: "13:15",
      subject: "Lunch Break",
      faculty: "—",
      room: "Mess",
      kind: "break" as const,
    });
    return list;
  });

  return {
    id,
    department,
    year,
    slots,
    updatedAt: new Date(Date.now() - 4 * 86_400_000).toISOString(),
    uploadedBy,
  };
}
