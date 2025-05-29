import { useTeeTimes } from "../api/tee-times";

export default function TeeTimes() {
  const { data: teeTimes, isLoading, error } = useTeeTimes();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading tee-times</div>;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Tee Times</h2>
      <ul>
        {teeTimes?.map((teeTime) => (
          <li key={teeTime.id} className="mb-2">
            {new Date(teeTime.teetime).toLocaleString()}
          </li>
        ))}
      </ul>
    </div>
  );
}
