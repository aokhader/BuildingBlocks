// Liveblocks types for this app
// https://liveblocks.io/docs/api-reference/liveblocks-react#Typing-your-data
declare global {
  interface Liveblocks {
    Presence: {
      // Canvas coordinates; null when the pointer is off the canvas.
      cursor: { x: number; y: number } | null;
      thinking: boolean;
    };

    UserMeta: {
      id: string;
      info: {
        name: string;
        avatar: string;
        color: string;
      };
    };
  }
}

export {};
