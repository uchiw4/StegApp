// FEATURE DISABLED IN V2.1 (AIR-GAP COMPLIANCE)
// To re-enable in V3.0, restore @google/genai dependency and implementation.

export const generateCoverImage = async (prompt: string, apiKey: string): Promise<string> => {
    throw new Error("FEATURE_DISABLED: Remote generation not available in Secure Mode.");
};
