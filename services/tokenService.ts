export const TokenService = {
  /**
   * Estimates token count based on character length.
   * Standard rule of thumb for OpenAI models is ~4 characters per token.
   * This is a client-side estimation to avoid heavy dependencies.
   */
  estimate: (text: string): number => {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
  },

  /**
   * Resolves variables in a text string to get the actual content sent to the LLM.
   */
  resolveVariables: (text: string, variables: Record<string, string>): string => {
    let resolved = text;
    Object.entries(variables).forEach(([key, val]) => {
      // Simple string replacement for {key}
      // Using split/join handles multiple occurrences
      resolved = resolved.split(`{${key}}`).join(val || '');
    });
    return resolved;
  }
};