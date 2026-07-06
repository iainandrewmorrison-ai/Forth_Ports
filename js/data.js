/* =============================================================
   Enlightened People — AI Readiness Portal
   Questionnaire content: scored sections + open-text scoping
   ============================================================= */

const SCALE = [
  { value: 1, label: "Not at all" },
  { value: 2, label: "Rarely" },
  { value: 3, label: "Sometimes" },
  { value: 4, label: "Mostly" },
  { value: 5, label: "Fully embedded" }
];

const SECTIONS = [
  {
    id: "A",
    key: "data",
    title: "Data and systems",
    short: "Data & systems",
    intro: "AI works best when information is easy to find, current and held in trusted systems. Scattered, outdated or sensitive data requires extra care.",
    questions: [
      { text: "Our core HR records, including people data, contracts and policies, sit in modern digital systems rather than spreadsheets, paper files or informal records.", theme: "Core HR records held in modern digital systems" },
      { text: "We know where our HR data lives and it is not spread across personal drives, inboxes and disconnected tools.", theme: "Knowing where HR data lives" },
      { text: "Our HR data is reasonably clean, consistent and current.", theme: "Data quality and currency" },
      { text: "Our main HR systems can share information with each other or with the wider business without heavy re-keying.", theme: "Systems that connect without re-keying" },
      { text: "We could answer a question about our workforce from current data, rather than relying on one person’s memory.", theme: "Answering workforce questions from data" },
      { text: "We understand which HR data is sensitive, confidential or unsuitable for use in public AI tools.", theme: "Clarity on sensitive and confidential data" }
    ]
  },
  {
    id: "B",
    key: "process",
    title: "Processes and workflows",
    short: "Processes",
    intro: "AI can support repeatable work more easily when processes are clear. Work that lives only in people’s heads is harder to improve or automate.",
    questions: [
      { text: "Our main HR processes, such as recruitment, onboarding, employee relations, absence, performance and queries, are written down.", theme: "Documented core HR processes" },
      { text: "Routine HR tasks follow broadly the same steps regardless of who carries them out.", theme: "Consistent ways of working" },
      { text: "Key HR tasks have moved away from paper and manual handling into digital workflows.", theme: "Digital rather than manual workflows" },
      { text: "We can name the repetitive, time-consuming HR tasks that would be worth improving with AI or Copilot.", theme: "Identifying tasks worth improving with AI" },
      { text: "When someone is away, others can pick up their HR work without major disruption.", theme: "Cover and continuity when people are away" },
      { text: "We have examples of recent HR tasks that took longer than they should have and could be useful for training exercises.", theme: "Real task examples for training exercises" }
    ]
  },
  {
    id: "C",
    key: "skills",
    title: "AI knowledge, skills and current use",
    short: "AI skills & use",
    intro: "Copilot and other AI tools only create value when people understand what they can do, where their limits are and how to use them safely.",
    questions: [
      { text: "Our team understands, in practical terms, what current AI tools such as Microsoft Copilot can and cannot do.", theme: "Practical understanding of what AI can and cannot do" },
      { text: "People in the HR team have used AI tools for real work, not only for experiments.", theme: "Using AI for real work, not just experiments" },
      { text: "We have a shared basic method for writing prompts and improving AI outputs.", theme: "A shared approach to prompting" },
      { text: "The team can spot when an AI answer is wrong, biased, incomplete or needs checking.", theme: "Spotting wrong or biased AI answers" },
      { text: "We have access to the AI tools we need, rather than relying on free or personal accounts.", theme: "Access to approved AI tools" },
      { text: "Everyone expected to attend training has working access to Microsoft Copilot or the relevant approved tools.", theme: "Working Copilot access for all attendees" }
    ]
  },
  {
    id: "D",
    key: "governance",
    title: "Governance, risk and compliance",
    short: "Governance",
    intro: "HR handles personal data and decisions about people. Responsible AI use requires clear boundaries, confidence and good judgement.",
    questions: [
      { text: "We have a written policy or clear guidance on how AI may and may not be used in HR.", theme: "Written AI policy or guidance" },
      { text: "We understand our UK GDPR and data protection responsibilities when using AI tools.", theme: "UK GDPR and data protection understanding" },
      { text: "Staff know not to paste confidential, personal or sensitive employee data into public AI tools.", theme: "Keeping sensitive data out of public AI tools" },
      { text: "We have considered fairness and bias where AI might touch recruitment, performance, pay, employee relations or workforce decisions.", theme: "Fairness and bias in people decisions" },
      { text: "We understand when human review, judgement and sign-off are required.", theme: "Clarity on human review and sign-off" },
      { text: "We know what would make us comfortable saying, “yes, AI can be used for that task.”", theme: "Clear comfort criteria for AI use" }
    ]
  },
  {
    id: "E",
    key: "culture",
    title: "Culture, confidence and leadership",
    short: "Culture & leadership",
    intro: "AI adoption succeeds when leaders support it, teams have time to learn and concerns are addressed openly.",
    questions: [
      { text: "HR leadership actively supports responsible AI use.", theme: "Leadership support for responsible AI" },
      { text: "The HR team is more curious than anxious about AI.", theme: "Curiosity rather than anxiety about AI" },
      { text: "We have, or could protect, time to learn and improve rather than only firefight.", theme: "Protected time to learn" },
      { text: "Good ideas and useful examples spread across the team rather than staying with one person.", theme: "Ideas spreading across the team" },
      { text: "We can identify likely AI champions who could help others after the training.", theme: "Identifiable AI champions" },
      { text: "We understand the main fears or objections people may raise, such as job security, data concerns, lack of confidence or cynicism about another initiative.", theme: "Understanding fears and objections" }
    ]
  },
  {
    id: "F",
    key: "experience",
    title: "Employee experience, trust and adoption",
    short: "Experience & trust",
    intro: "AI should improve the way HR supports people, not just reduce time spent on tasks. Trust is central.",
    questions: [
      { text: "We consider employee experience when introducing new tools, not only efficiency.", theme: "Employee experience considered alongside efficiency" },
      { text: "We could explain to employees, in plain English, how and why AI is being used in HR.", theme: "Being able to explain AI use in plain English" },
      { text: "Employees and managers have clear, easy ways to reach HR for support.", theme: "Clear routes to reach HR" },
      { text: "We are open with people about where AI may influence work that affects them.", theme: "Openness about where AI influences work" },
      { text: "We have ways to gather feedback when HR services or tools change.", theme: "Feedback loops when services change" },
      { text: "We know what success would look like three months after the training.", theme: "A clear picture of success at three months" }
    ]
  }
];

const OPEN_GROUPS = [
  {
    key: "world",
    title: "Your world and workload",
    intro: "Help us understand where your team’s time really goes, so the training reflects your actual work.",
    questions: [
      "Walk us through a typical week for your HR team. Where does the time actually go?",
      "What are the three most repetitive, tedious or time-consuming tasks your team handles?",
      "What important work regularly gets squeezed out because there is not enough time?",
      "Are there differences between sites, teams or locations that the training should reflect?",
      "What current business or workforce changes should we understand before designing the training?"
    ]
  },
  {
    key: "aireality",
    title: "Current AI reality",
    intro: "Tell us what is genuinely happening with Copilot and AI today — the good, the bad and the not-yet-started.",
    questions: [
      "How are people already using Copilot or other AI tools in practice?",
      "What is the best result anyone has had with AI so far?",
      "What has not worked well, or where has AI created concern?",
      "Are there any known risks, near misses or examples that should shape the governance part of the training? Do not include personal or confidential details.",
      "Does everyone who needs Copilot currently have access and can they open and use it?"
    ]
  },
  {
    key: "documents",
    title: "Data and documents",
    intro: "Copilot works with your documents, so it helps to know what your team creates and where things live.",
    questions: [
      "What kinds of HR documents does your team create or update most often?",
      "Where do your key documents usually live: SharePoint, shared drives, OneDrive, email attachments or elsewhere?",
      "Are there templates, policies, reports or house-style documents that could be used as safe training examples?",
      "What types of HR information should be treated as especially sensitive in training discussions?",
      "Are there any document-management issues that might affect how well Copilot works?"
    ]
  },
  {
    key: "attitude",
    title: "Ability and attitude",
    intro: "Every team has a mix of confidence levels. Knowing yours helps us pitch the training well.",
    questions: [
      "If you grouped your team into confident, curious and reluctant users, what would the approximate mix be?",
      "Who might become champions or early adopters?",
      "What is the biggest fear, objection or misconception you expect to hear?",
      "What would help people feel safe and confident using AI?",
      "What support would be needed after the initial training?"
    ]
  },
  {
    key: "usecases",
    title: "Use cases for practical exercises",
    intro: "The best training uses your real work. Share tasks we could turn into hands-on Copilot exercises.",
    questions: [
      "Give two or three recent HR tasks that took longer than they should have.",
      "What does your team write most often: emails, policies, letters, reports, briefings, manager guidance, employee communications or something else?",
      "What questions do employees or managers ask repeatedly?",
      "What reports, analysis or summaries take the most effort?",
      "What would be a genuinely useful Copilot exercise for your team?"
    ]
  },
  {
    key: "governance",
    title: "Governance and policy",
    intro: "Responsible AI needs clear boundaries. Tell us how rules and expectations currently feel on the ground.",
    questions: [
      "What rules do people currently think apply to AI use?",
      "Are there union, works council, employee relations or trust issues that should be considered?",
      "What tasks would you be comfortable allowing AI to support?",
      "What tasks should remain human-led or off-limits?",
      "What would a useful AI policy or guidance document need to include?"
    ]
  },
  {
    key: "success",
    title: "Success and follow-through",
    intro: "We want the learning to stick. Help us understand what success looks like for you.",
    questions: [
      "Three months after training, what would tell you it had worked?",
      "What has caused previous training to fade or fail to stick?",
      "What has helped previous training succeed?",
      "What would make this programme feel practical rather than theoretical?",
      "What should Enlightened People prioritise in the scoping meeting?"
    ]
  }
];

const BANDS = [
  {
    min: 0, max: 39, name: "Early-stage readiness",
    blurb: "The organisation has opportunities to build foundations before scaling AI use.",
    message: "Thank you — this is a really useful starting point. Your responses suggest your team is at an early stage of AI readiness, which is completely normal and exactly why this scoping work matters. There is no expectation that you should already be further ahead. The training will focus on building solid foundations: understanding what Copilot can genuinely do for HR, agreeing simple and safe ways of working, and choosing a small number of practical tasks where AI can help straight away. Early-stage teams often see the biggest and fastest wins, because there is so much everyday work that good habits can improve."
  },
  {
    min: 40, max: 59, name: "Developing readiness",
    blurb: "There are useful pockets of readiness, but training should focus on consistency, confidence and safe use.",
    message: "Thank you — your responses show developing readiness, with useful pockets of capability already in place. Some things are working well; others are inconsistent or depend on individual people. That is a very common position for HR teams right now. The training will focus on turning those pockets into shared, consistent practice: building confidence across the whole team, agreeing what safe use looks like, and applying Copilot to the tasks that eat the most time. You are well placed to make quick, visible progress."
  },
  {
    min: 60, max: 79, name: "Strong readiness",
    blurb: "The organisation is well placed to benefit from Copilot, with targeted support around priority use cases and governance.",
    message: "Thank you — your responses show strong readiness. Your team already has many of the foundations in place, which means the training can move quickly into practical, hands-on territory. We will focus on your priority use cases, sharpen prompting and reviewing skills, and make sure governance keeps pace with adoption so confidence stays high. The aim is to convert good foundations into consistent, everyday value."
  },
  {
    min: 80, max: 100, name: "Advanced readiness",
    blurb: "The organisation is ready to move beyond basic adoption into repeatable practice, champions, playbooks and measurable impact.",
    message: "Thank you — your responses show advanced readiness. Your team is ready to move beyond first steps into repeatable practice: developing champions, building playbooks for your highest-value use cases and measuring the difference Copilot makes. The training will be pitched accordingly — less “what is AI?” and more “how do we make this stick, scale it responsibly and prove the impact?”"
  }
];
