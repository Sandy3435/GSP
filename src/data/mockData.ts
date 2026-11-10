/*
 * GSP — Campfire Commons mock data
 * Content mirrors the imported Stitch design specs.
 * Avatars are rendered as gradient + initials so the app is fully self-contained.
 */

export interface LiveSession {
  id: string
  title: string
  host: string
  hostDetail: string
  timeBadge: string
  timeTone: 'error' | 'neutral' | 'secondary'
  attendees: number
  saved?: boolean
}

export const liveSessions: LiveSession[] = [
  {
    id: 'session-stanford',
    title: 'Stanford & QuestBridge: Insider Peer AMA',
    host: 'Marcus C.',
    hostDetail: "Stanford '27",
    timeBadge: 'Today • 6:30 PM EST',
    timeTone: 'error',
    attendees: 142,
  },
  {
    id: 'session-mit',
    title: 'MIT Maker Portfolio Breakdown & Review',
    host: 'Sarah L.',
    hostDetail: "MIT '26",
    timeBadge: 'Tomorrow • 7:00 PM EST',
    timeTone: 'neutral',
    attendees: 88,
  },
  {
    id: 'session-gates',
    title: 'Gates Scholarship Q&A Session',
    host: 'David O.',
    hostDetail: "Gates Scholar • Duke '25",
    timeBadge: 'Thursday • 5:00 PM EST',
    timeTone: 'secondary',
    attendees: 56,
    saved: true,
  },
]

export interface WatchlistOpportunity {
  id: string
  title: string
  match: number
  tag: string
  deadline: string
  daysLeft: string
  urgent: boolean
  status: string
  statusTone: 'done' | 'saved'
  cta: string
  ctaIcon: string
}

export const watchlist: WatchlistOpportunity[] = [
  {
    id: 'watch-questbridge',
    title: 'QuestBridge National Match',
    match: 99,
    tag: 'Full-Ride Potential',
    deadline: 'Sep 26',
    daysLeft: '12 days left',
    urgent: true,
    status: 'Application Drafted',
    statusTone: 'done',
    cta: 'Continue',
    ctaIcon: 'arrow_forward',
  },
  {
    id: 'watch-coolidge',
    title: 'Coolidge Presidential Scholarship',
    match: 92,
    tag: 'Merit-Based',
    deadline: 'Nov 15',
    daysLeft: '62 days left',
    urgent: false,
    status: 'Saved to List',
    statusTone: 'saved',
    cta: 'Start Draft',
    ctaIcon: 'edit_note',
  },
]

export type ServiceCategory = 'writing' | 'audit' | 'mentorship' | 'intl'

export interface Service {
  id: string
  category: ServiceCategory
  badge?: string
  badgeIcon?: string
  badgeTone: 'popular' | 'comprehensive' | 'live' | 'neutral'
  title: string
  price: string
  priceUnit: string
  description: string
  features?: { icon: string; label: string }[]
  cta: string
  ctaTone: 'primary' | 'secondary' | 'sage'
}

export const serviceCategories: { id: ServiceCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All Services' },
  { id: 'writing', label: 'Essay & Writing' },
  { id: 'audit', label: 'App Review' },
  { id: 'mentorship', label: '1-on-1 Mentorship' },
  { id: 'intl', label: "Financial & Int'l" },
]

export const services: Service[] = [
  {
    id: 'svc-essay',
    category: 'writing',
    badge: 'Most Popular',
    badgeIcon: 'star',
    badgeTone: 'popular',
    title: 'Comprehensive Essay Review & Line Polish',
    price: '$45',
    priceUnit: '/ draft',
    description:
      'Structural voice critique, thematic hook refinement, line-by-line grammar polish, plus 1 free iteration pass.',
    features: [
      { icon: 'edit_note', label: 'Marginal Annotations' },
      { icon: 'psychology', label: 'Hook & Arc Diagnostic' },
      { icon: 'replay', label: '1 Free Re-Review' },
      { icon: 'school', label: 'Yale/Harvard Readers' },
    ],
    cta: 'Book Essay Review',
    ctaTone: 'primary',
  },
  {
    id: 'svc-audit',
    category: 'audit',
    badge: 'Comprehensive',
    badgeIcon: 'fact_check',
    badgeTone: 'comprehensive',
    title: 'Full Application Package Audit',
    price: '$180',
    priceUnit: 'Full package',
    description:
      'Complete holistic review: Personal statement, up to 5 supplements, Activities List priority re-ordering, and a 30-min recorded mentor video walkthrough.',
    cta: 'Book Full Package Audit',
    ctaTone: 'primary',
  },
  {
    id: 'svc-mentor',
    category: 'mentorship',
    badge: 'Live Video',
    badgeIcon: 'videocam',
    badgeTone: 'live',
    title: '1-on-1 Office Hours with Mentor',
    price: '$35',
    priceUnit: '/ 45 min',
    description:
      'Direct 45-minute video call tailored to your intended major and target colleges. Mock interview, school list curation, or essay brain dumps.',
    cta: 'Schedule Live Session',
    ctaTone: 'primary',
  },
  {
    id: 'svc-intl',
    category: 'intl',
    badgeTone: 'neutral',
    title: 'Financial & Wire Help',
    price: '$25',
    priceUnit: 'or Free w/ aid',
    description:
      'Complete help navigating Flywire, Convera, ISFAA/CSS Profile aid applications, currency conversions, and testing fee waiver verification.',
    cta: 'Get Payment & Aid Guidance',
    ctaTone: 'sage',
  },
]

export interface SprintDay {
  day: string
  title: string
  note: string
  state: 'done' | 'active' | 'locked'
}

export const sprintDays: SprintDay[] = [
  {
    day: 'Day 1',
    title: 'Core Values Brainstorming',
    note: 'Completed • 3 reflections logged',
    state: 'done',
  },
  {
    day: 'Day 2',
    title: '“Why This Major” Outline',
    note: 'Completed • Mentor rubric satisfied',
    state: 'done',
  },
  {
    day: 'Day 3',
    title: 'Hook & Narrative Arc Workshop',
    note: 'Completed • Attended cohort replay',
    state: 'done',
  },
  {
    day: 'Day 4',
    title: 'Peer Review Circle',
    note: 'Submit your 650-word activities draft to receive targeted feedback from 2 cohort peers.',
    state: 'active',
  },
  {
    day: 'Day 5',
    title: 'Addressing Feedback & Revision Strategy',
    note: 'Unlocks tomorrow at 6:00 AM',
    state: 'locked',
  },
]

export interface Sprint {
  id: string
  badge: string
  badgeTone: 'secondary' | 'tertiary' | 'neutral'
  title: string
  meta: string
  description: string
  icon: string
  spots: string
  spotsTone: 'secondary' | 'tertiary'
  cta: string
}

export const upcomingSprints: Sprint[] = [
  {
    id: 'sprint-fafsa',
    badge: 'Free Cohort',
    badgeTone: 'secondary',
    title: 'FAFSA & CSS Profile Master Sprint',
    meta: '5 Days • Oct 1–Oct 5',
    description:
      'Step-by-step parent/student co-working to unlock maximum institutional aid without missing early deadlines.',
    icon: 'account_balance',
    spots: '114 students ready',
    spotsTone: 'secondary',
    cta: 'Enroll Now',
  },
  {
    id: 'sprint-supp',
    badge: 'High Demand',
    badgeTone: 'tertiary',
    title: 'Supplemental Essay Strategy: Ivy+ & Top 30',
    meta: '7 Days • Starts Oct 5',
    description:
      'Template breaking, school-specific research hacks, and community diversity prompts led by admitted seniors.',
    icon: 'school',
    spots: 'Cohort Full • 42 waiting',
    spotsTone: 'tertiary',
    cta: 'Join Waitlist',
  },
  {
    id: 'sprint-stem',
    badge: 'New',
    badgeTone: 'neutral',
    title: 'STEM Research Portfolio & Abstract Sprint',
    meta: '4 Days • Starts Oct 12',
    description:
      'Condense lab research, Olympiad projects, or engineering build logs into high-impact supplemental portfolios.',
    icon: 'biotech',
    spots: '88 spots remaining',
    spotsTone: 'secondary',
    cta: 'Enroll Now',
  },
]

export interface Cohort {
  id: string
  title: string
  schedule: string
  leads: string
  enrolled: number
  pace: string
}

export const cohorts: Cohort[] = [
  {
    id: 'cohort-ea',
    title: 'Early Application Mastermind',
    schedule: 'Tuesdays & Thursdays • 7 PM EST',
    leads: 'Alex R. (Yale ’25) & Priya M. (Stanford ’26)',
    enrolled: 248,
    pace: 'Weekly live reviews',
  },
  {
    id: 'cohort-rd',
    title: 'Regular Decision Essay Circle',
    schedule: 'Saturdays • 11 AM EST',
    leads: 'Jordan H. (Harvard ’26)',
    enrolled: 132,
    pace: 'Peer review driven',
  },
  {
    id: 'cohort-firstgen',
    title: 'First-Gen Application Fellowship',
    schedule: 'Sundays • 4 PM EST',
    leads: 'Counselor Dan & Elena T. (Northwestern ’28)',
    enrolled: 96,
    pace: 'Mentor-led cohorts',
  },
]

export type CourseCategory =
  | 'foundations'
  | 'essay'
  | 'research'
  | 'financial'
  | 'progress'

export interface Course {
  id: string
  category: CourseCategory
  modules: number
  price?: string
  free?: boolean
  title: string
  description: string
  topics: string[]
  stats: { icon: string; label: string }[]
  cta: string
  ctaIcon: string
  gradient: string
  icon: string
}

export const courseTabs: { id: CourseCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All Pathways' },
  { id: 'progress', label: 'In Progress' },
  { id: 'foundations', label: 'Foundations' },
  { id: 'essay', label: 'Essay Lab' },
  { id: 'research', label: 'Research' },
  { id: 'financial', label: 'Admissions Systems' },
]

export const courses: Course[] = [
  {
    id: 'course-foundations',
    category: 'foundations',
    modules: 6,
    free: true,
    title: 'Admissions Foundations: Getting Started',
    description:
      'Understand timelines, build your balanced college list (Reach, Match, Safety), calculate demonstrated need, and align high school coursework.',
    topics: [
      'Timeline Architecture',
      'Extracurricular Strategy',
      'Counselor Relationship',
      'Testing Strategies',
    ],
    stats: [
      { icon: 'videocam', label: '18 video lessons' },
      { icon: 'description', label: '4 worksheets' },
      { icon: 'forum', label: 'Mentor Q&A' },
    ],
    cta: 'View Syllabus & Modules',
    ctaIcon: 'arrow_forward',
    gradient: 'from-primary-container via-primary to-secondary-fixed',
    icon: 'auto_stories',
  },
  {
    id: 'course-essay',
    category: 'essay',
    modules: 8,
    price: '$49',
    title: 'Essay Writing Lab',
    description:
      'Deconstruct winning Common App personal statements, master narrative voice, avoid clichés, and polish supplemental essays.',
    topics: [
      'Personal Statement',
      'Core Values Matrix',
      'Why Us / Why Major',
      'Peer Workshop',
    ],
    stats: [
      { icon: 'folder_special', label: '8 Modules' },
      { icon: 'article', label: '24 Exemplar Essays' },
      { icon: 'headphones', label: 'Audio Breakdowns' },
    ],
    cta: 'Enter Essay Lab',
    ctaIcon: 'edit_note',
    gradient: 'from-secondary-fixed-dim via-secondary to-primary-container',
    icon: 'edit_note',
  },
  {
    id: 'course-research',
    category: 'research',
    modules: 5,
    price: '$59',
    title: 'Research Lab & Academic Honors',
    description:
      'Transform independent research, Olympiads, laboratory assistantships, and creative portfolios into compelling admissions supplemental materials.',
    topics: [
      'Cold Emailing Faculty',
      'Writing Abstracts',
      'Maker Portfolios',
      'Science Fairs',
    ],
    stats: [
      { icon: 'science', label: '5 Modules' },
      { icon: 'draft', label: 'Abstract Templates' },
      { icon: 'co_present', label: 'Lab Showcase' },
    ],
    cta: 'Explore Research Lab',
    ctaIcon: 'biotech',
    gradient: 'from-tertiary-fixed-dim via-tertiary-container to-primary',
    icon: 'biotech',
  },
  {
    id: 'course-financial',
    category: 'financial',
    modules: 4,
    free: true,
    title: 'Admissions Systems & Financial Mastery',
    description:
      'Demystify CSS Profile, FAFSA, institutional methodology, fee waivers, scholarship hunting, and financial aid appeal letters.',
    topics: [
      'FAFSA Step-by-Step',
      'CSS Profile Tips',
      'Scholarship Matrix',
      'Award Letter Analysis',
    ],
    stats: [
      { icon: 'account_balance', label: '4 Modules' },
      { icon: 'calculate', label: 'Calculator Tools' },
      { icon: 'loyalty', label: 'Appeal Templates' },
    ],
    cta: 'Start Pathway',
    ctaIcon: 'arrow_forward',
    gradient: 'from-primary via-primary-container to-secondary-fixed',
    icon: 'account_balance',
  },
]

export interface PollOption {
  label: string
  pct: number
  tone: 'secondary' | 'primary'
}

export interface Post {
  id: string
  pinned?: boolean
  guide?: boolean
  author: string
  authorInitials: string
  avatarTone: 'pine' | 'sage' | 'amber' | 'slate'
  badge?: string
  time: string
  tag: string
  title: string
  excerpt: string
  votes: number
  replies: number
  verifiedAnswers?: string
  topAnswer?: string
  poll?: PollOption[]
  pollVotes?: number
  mediaLabel?: string
  mine?: boolean
}

export const communityTags = [
  '#CommonAppEssays',
  '#FinancialAid & FAFSA',
  '#IvyLeague',
  '#FlyInPrograms',
  '#InterviewPrep',
]

export const initialPosts: Post[] = [
  {
    id: 'post-pinned',
    pinned: true,
    guide: true,
    author: 'u/Jordan_Harvard26',
    authorInitials: 'JH',
    avatarTone: 'pine',
    badge: 'Mentor 🎓',
    time: '3h ago',
    tag: '#CommonAppEssays',
    title:
      'Common App Prompt #1 Breakdown: How I wrote about my immigrant family bakery without sounding cliché',
    excerpt:
      'A lot of students think they need a dramatic life crisis to write a memorable essay. In this guide, I share my breakdown of turning micro-moments into powerful storytelling...',
    votes: 341,
    replies: 87,
    mediaLabel: 'Mentor Breakdown Inside',
  },
  {
    id: 'post-css',
    author: 'u/Elena_Senior',
    authorInitials: 'E',
    avatarTone: 'sage',
    time: '45m ago',
    tag: '#FinancialAid',
    title: 'CSS Profile tax forms when parents are self-employed? Help!',
    excerpt:
      'My parents run a small landscaping business and have Schedule C. Does anyone know if institutional methodology counts gross or net revenue for tuition discount?',
    votes: 128,
    replies: 14,
    verifiedAnswers: '3 Answers • 1 Verified Counselor Reply',
    topAnswer:
      'Most institutional formulas recalculate Schedule C net income by adding back depreciation and personal vehicle expenses...',
  },
  {
    id: 'post-flyin',
    author: 'u/Kev_Bio',
    authorInitials: 'K',
    avatarTone: 'amber',
    time: '2h ago',
    tag: '#FlyInPrograms',
    title:
      'Has anyone heard back from Dartmouth Bound or Columbia CEOP round 2 yet?',
    excerpt:
      'Applying to both fly-in programs and wondering about timelines. Curious how the community is feeling while waiting.',
    votes: 95,
    replies: 42,
    poll: [
      { label: 'Still waiting', pct: 68, tone: 'secondary' },
      { label: 'Accepted!', pct: 24, tone: 'primary' },
    ],
    pollVotes: 112,
  },
  {
    id: 'post-interview',
    author: 'u/Priya_Stanford26',
    authorInitials: 'P',
    avatarTone: 'slate',
    badge: 'Mentor 🎓',
    time: '5h ago',
    tag: '#InterviewPrep',
    title: 'What “Why Us” answers actually sound like (with real examples)',
    excerpt:
      'After conducting 40+ mock interviews, here are the three structures that consistently land with admissions officers — and the traps to avoid.',
    votes: 76,
    replies: 23,
  },
]

export interface Opportunity {
  id: string
  title: string
  match: number
  tags: string[]
  award: string
  awardIcon: string
  summary: string
  deadline: string
  daysLeft: number
  fullRide?: boolean
  flyIn?: boolean
  noEssay?: boolean
  eligibility?: {
    minGpa?: number
    majors?: string[]
    firstGenOnly?: boolean
    lowIncomeOnly?: boolean
    urmOnly?: boolean
    interests?: string[]
    states?: string[]
    graduationYears?: number[]
  }
}

export const opportunities: Opportunity[] = [
  {
    id: 'opp-questbridge',
    title: 'QuestBridge National College Match',
    match: 99,
    tags: ['Full 4-Year', 'First-Gen/Low-Income'],
    award: '$320,000+ total award',
    awardIcon: 'monetization_on',
    summary:
      'Full four-year scholarship covering tuition, room and board to 50+ top partner colleges including Yale, MIT, Stanford, and Princeton.',
    deadline: 'Sep 26',
    daysLeft: 14,
    fullRide: true,
    eligibility: {
      firstGenOnly: true,
      lowIncomeOnly: true,
      minGpa: 3.5,
      graduationYears: [2026, 2027],
    },
  },
  {
    id: 'opp-amherst',
    title: 'Amherst College Access to Amherst (A2A) Fly-In',
    match: 96,
    tags: ['Free Travel & Stay', 'Diversity Fly-In'],
    award: 'Fully funded travel + fee waiver',
    awardIcon: 'flight_takeoff',
    summary:
      'All-expenses-paid campus visit program for prospective applicants to explore campus, sit in on seminars, and connect with admissions.',
    deadline: 'Oct 3',
    daysLeft: 21,
    flyIn: true,
  },
  {
    id: 'opp-cocacola',
    title: 'Coca-Cola Scholars Foundation',
    match: 94,
    tags: ['Merit Scholarship', 'Leadership'],
    award: '$20,000 award (150 recipients)',
    awardIcon: 'military_tech',
    summary:
      'Prestigious achievement-based scholarship recognizing students for leadership, service, and significant community commitment.',
    deadline: 'Oct 2',
    daysLeft: 20,
  },
  {
    id: 'opp-rsi',
    title: 'Research Science Institute (RSI) Cohort',
    match: 91,
    tags: ['Summer Research', 'STEM Prodigy'],
    award: 'Cost-free 6-week MIT residency',
    awardIcon: 'biotech',
    summary:
      'Combine on-campus scientific theory course with off-campus work in science and technology research with world-renowned scientists.',
    deadline: 'Dec 15',
    daysLeft: 62,
    eligibility: {
      majors: ['Biology / Pre-Med', 'Engineering', 'Computer Science'],
      interests: ['STEM Research'],
      minGpa: 3.7,
    },
  },
  {
    id: 'opp-coolidge',
    title: 'Coolidge Presidential Scholarship',
    match: 92,
    tags: ['Merit-Based', 'Full Ride'],
    award: 'Full undergraduate tuition',
    awardIcon: 'account_balance',
    summary:
      'The most generous merit scholarship in America — awarded to one student per nominating high school, covering tuition, room, and board.',
    deadline: 'Nov 15',
    daysLeft: 52,
    fullRide: true,
  },
  {
    id: 'opp-gates',
    title: 'Gates Scholarship',
    match: 95,
    tags: ['Full-Ride', 'Leadership'],
    award: '$50,000+ total award',
    awardIcon: 'workspace_premium',
    summary:
      'Last-dollar scholarship for outstanding minority, low-income, first-generation college students with proven leadership impact.',
    deadline: 'Sep 30',
    daysLeft: 18,
    fullRide: true,
    eligibility: {
      urmOnly: true,
      minGpa: 3.3,
      interests: ['Leadership', 'Community Service'],
    },
  },
  {
    id: 'opp-mit-esap',
    title: 'MIT Engineering Summer Academy (ESAP)',
    match: 88,
    tags: ['Summer Program', 'No Essay Required'],
    award: 'Prestige + MIT certificate',
    awardIcon: 'science',
    summary:
      'Selective six-week summer program with MIT faculty. Rolling admissions and no personal essay required for the first-round review.',
    deadline: 'Oct 15',
    daysLeft: 33,
    noEssay: true,
  },
  {
    id: 'opp-dell',
    title: 'Dell Scholars Program',
    match: 90,
    tags: ['Full-Ride Potential', 'No Essay Required'],
    award: '$20,000 + laptop + textbook credits',
    awardIcon: 'laptop_mac',
    summary:
      'For students who have overcome significant barriers to college access. Includes ongoing mentoring and a laptop for college.',
    deadline: 'Dec 1',
    daysLeft: 49,
    fullRide: true,
    noEssay: true,
  },
]
