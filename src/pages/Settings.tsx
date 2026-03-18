import { AttendanceTable } from '../components/settings/AttendanceTable';
import WorkScheduleForm from '../components/settings/WorkScheduleForm'

const Settings = () => {
    
  return (
    <div>
        <h1 className='text-2xl text-primary font-bold'>Attenence Settings</h1>
        <WorkScheduleForm />
        <AttendanceTable />
    </div>
  )
}

export default Settings