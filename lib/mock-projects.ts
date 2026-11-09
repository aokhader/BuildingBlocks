export interface Project {
  id: string;
  name: string;
  slug: string;
  isOwner: boolean;
}

// Mock data until project persistence lands.
export const MOCK_PROJECTS: Project[] = [
  { id: "p1", name: "Payments Platform", slug: "payments-platform", isOwner: true },
  { id: "p2", name: "Realtime Chat", slug: "realtime-chat", isOwner: true },
  { id: "p3", name: "Analytics Pipeline", slug: "analytics-pipeline", isOwner: false },
];
