import { ResultsScreen } from '@/components/results-screen';
import { ResultsTools } from '@/components/results-tools';

export default function ResultsPage() {
  return (
    <main id="main" className="flex-1">
      <ResultsTools />
      <ResultsScreen />
    </main>
  );
}
