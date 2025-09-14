import ClockInOutCard from './ClockInOutCard';
import MyTimesheet from './MyTimesheet';

export default function ClockPage() {
  return (
    <div className="p-6">
      <div className="mx-auto mb-4 max-w-6xl">
        <h1 className="text-xl font-semibold">Time Tracking</h1>
        <p className="text-sm text-slate-600">Clock in/out and review your recent entries.</p>
      </div>
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-2">
        <ClockInOutCard />
        <MyTimesheet />
      </div>
    </div>
  );
}
