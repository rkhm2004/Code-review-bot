const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface AnalysisRequest {
  source_code: string;
  language: string;
  file_path: string;
  compiler_log?: string;
  static_analysis?: string;
  runtime_log?: string;
}

export const api = {
  async analyze(request: AnalysisRequest) {
    const response = await fetch(`${API_BASE_URL}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Analysis failed");
    return data;
  },
  async disposition(findingId: string, status: string, reviewerNote = "") {
    const response = await fetch(`${API_BASE_URL}/disposition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ finding_id: findingId, status, reviewer_note: reviewerNote }),
    });
    return response.json();
  },
};
