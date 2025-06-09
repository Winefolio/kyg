import { useQuery } from "@tanstack/react-query";

export default function AnalyticsTest() {
  const sessionId = "ca44eaba-20f8-4eee-92fa-4031bcd475c9";
  const participantId = "bcae6763-70ff-4ace-a6ff-302da36853a7";
  
  const { data, isLoading, error } = useQuery({
    queryKey: [`/api/sessions/${sessionId}/participant-analytics/${participantId}`],
    enabled: true,
  });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Analytics Test</h1>
      <div className="space-y-4">
        <div>Loading: {String(isLoading)}</div>
        <div>Error: {error?.message || "None"}</div>
        <div>Data: {data ? "Loaded" : "None"}</div>
        {data && (
          <pre className="bg-gray-100 p-4 text-xs overflow-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}