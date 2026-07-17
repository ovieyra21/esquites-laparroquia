export const lovable = {
  auth: {
    signInWithOAuth: async () => ({ error: new Error("OAuth deshabilitado - modo local") }),
  },
};
