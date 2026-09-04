export const generateCreativeDescription = async (itemName: string, category: string): Promise<string> => {
  try {
    const response = await fetch("/api/gemini/description", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ itemName, category }),
    });

    if (!response.ok) {
      console.warn("Server response not ok when generating AI description:", response.statusText);
      return "";
    }

    const data = await response.json();
    return data.description || "";
  } catch (error) {
    console.error("Error generating description via server API:", error);
    return "";
  }
};
