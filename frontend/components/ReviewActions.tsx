"use client";

export default function ReviewActions() {
  const handleApprove = () => {
    alert("PR Approved! Triggering backend push to GitHub...");
  };

  const handleReject = () => {
    alert("Issues found. Sending comments back to GitHub PR...");
  };

  return (
    <div className="mt-8 flex justify-end gap-4 border-t border-gray-800 pt-6">
      <button 
        onClick={handleReject}
        className="px-6 py-2 bg-transparent border border-red-500 text-red-500 hover:bg-red-500/10 font-bold rounded-lg transition-colors"
      >
        Request Changes
      </button>
      <button 
        onClick={handleApprove}
        className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors shadow-lg shadow-green-900/20"
      >
        Approve & Merge
      </button>
    </div>
  );
}