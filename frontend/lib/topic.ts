// Topic wording for the UI. Must match the backend's TOPIC setting;
// terraform/demo/deploy.sh passes the same value to both.

export interface TopicCopy {
  appTitle: string;
  appDescription: string;
  formQuestion: string;
  formPlaceholder: string;
  suggestionPrompts: string[];
  dashboardTitle: string;
  itemLabel: string;
  itemLabelPlural: string;
}

const TOPICS: Record<string, TopicCopy> = {
  permits: {
    appTitle: "Boston Permit Feedback",
    appDescription: "Share feedback about your City of Boston permitting experience.",
    formQuestion: "How was your experience with permitting?",
    formPlaceholder: "Share feedback on your experience!",
    suggestionPrompts: [
      "What specific feature or service would you like to see improved?",
      "Can you describe a problem you encountered?",
      "What frustrated you about your recent interaction?",
    ],
    dashboardTitle: "Permit Feedback Analytics",
    itemLabel: "Permit Type",
    itemLabelPlural: "Permit Types",
  },
  parks: {
    appTitle: "Boston Parks Feedback",
    appDescription: "Help improve your local parks and playgrounds in Boston.",
    formQuestion: "How could your local park or playground be better?",
    formPlaceholder: "Tell us about a park or playground you use!",
    suggestionPrompts: [
      "Which park or playground do you visit, and in which neighborhood?",
      "Is something broken, unsafe, or hard to use?",
      "What would make you or your family use the park more?",
    ],
    dashboardTitle: "Parks Feedback Analytics",
    itemLabel: "Park Feature",
    itemLabelPlural: "Park Features",
  },
  housing: {
    appTitle: "Boston Housing & Heat Feedback",
    appDescription: "Tell the City about housing conditions and extreme heat where you live.",
    formQuestion: "How can the City help with housing conditions or extreme heat where you live?",
    formPlaceholder: "Tell us what is happening where you live.",
    suggestionPrompts: [
      "Which neighborhood do you live in?",
      "What is wrong, and how long has it been happening?",
      "Have you contacted anyone about it?",
    ],
    dashboardTitle: "Housing & Heat Feedback Analytics",
    itemLabel: "Issue Area",
    itemLabelPlural: "Issue Areas",
  },
};

const topicKey = process.env.NEXT_PUBLIC_TOPIC || "permits";

export const topic: TopicCopy = TOPICS[topicKey] ?? TOPICS.permits;

// Shown on the dashboard when the data is made up for a demo
export const showSampleDataNotice = process.env.NEXT_PUBLIC_SAMPLE_DATA_NOTICE === "true";
