import ClockInOutCard from './ClockInOutCard';
import MyTimesheet from './MyTimesheet';

export default function ClockPage() {
  return (
    <div className="p-6">
      <div className="grid gap-6 xl:grid-cols-[430px,1fr]">
        <ClockInOutCard />
        <MyTimesheet />
      </div>
    </div>
  );
}
