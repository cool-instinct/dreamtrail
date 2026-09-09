import DayCard from './DayCard'

export default function Timeline({ trip, days, memories, onChanged, onAddMemory, onPhotoClick, showToast }) {
  return (
    <div className="timeline">
      {days.map((day) => (
        <DayCard
          key={day.id}
          trip={trip}
          day={day}
          dayMem={memories.filter((m) => m.day === day.date)}
          onChanged={onChanged}
          onAddMemory={onAddMemory}
          onPhotoClick={onPhotoClick}
          showToast={showToast}
        />
      ))}
    </div>
  )
}
