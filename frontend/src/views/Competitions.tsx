import { useCompetitions } from "../api/competitions";

export default function Competitions() {
  const { data: competitions, isLoading, error } = useCompetitions();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading competitions</div>;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Competitions</h2>
      <ul>
        {competitions?.map((competition) => (
          <li key={competition.id} className="mb-2">
            {competition.name} -{" "}
            {new Date(competition.date).toLocaleDateString()}
          </li>
        ))}
      </ul>
    </div>
  );
}
