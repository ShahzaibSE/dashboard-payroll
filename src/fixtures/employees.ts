import { payrollRuns } from '@/fixtures/payroll'
import type { Employee } from '@/fixtures/types'

/**
 * A small fictional sample of people, four for every organisation and country that has a payroll run in the period.
 * It is a sample, not the full workforce (the runs cover thousands of people), and it says nothing about which run
 * anyone belongs to. Names are invented from fixed lists by position, so nothing is random and nothing depends on the clock.
 * The two name lists have coprime lengths (16 and 17), so no full name repeats within the first 272 people.
 */

const PEOPLE_PER_PAIR = 4

const givenNames = [
  'Aiko', 'Bastian', 'Calista', 'Desmond', 'Elowen', 'Farid', 'Greta', 'Hamish',
  'Ilse', 'Joaquin', 'Kaito', 'Leona', 'Marek', 'Noor', 'Oriel', 'Petra',
]

const familyNames = [
  'Alderwick', 'Brightmoor', 'Caldecott', 'Dunmere', 'Eastlake', 'Fennimore', 'Galbraith', 'Hartwell', 'Ingleby',
  'Jessamy', 'Kingsmead', 'Larkspur', 'Marlowe', 'Northcote', 'Ormerod', 'Pemberley', 'Quenby',
]

const jobTitles = [
  'Payroll analyst', 'Accounts clerk', 'Operations coordinator', 'Warehouse supervisor', 'Data analyst', 'Nurse manager',
  'Store manager', 'Software engineer', 'People partner', 'Logistics planner', 'Finance associate', 'Research scientist',
]

// One entry per organisation and country pair, in the order of the payroll runs, so the list is stable.
const pairs = payrollRuns.map((run) => ({ organizationId: run.organizationId, countryCode: run.countryCode }))

export const employees: Employee[] = pairs.flatMap((pair, pairIndex) =>
  Array.from({ length: PEOPLE_PER_PAIR }, (_, personIndex): Employee => {
    const index = pairIndex * PEOPLE_PER_PAIR + personIndex
    return {
      id: `emp-${String(index + 1).padStart(3, '0')}`,
      displayName: `${givenNames[index % givenNames.length]} ${familyNames[index % familyNames.length]}`,
      organizationId: pair.organizationId,
      countryCode: pair.countryCode,
      jobTitle: jobTitles[(index * 5) % jobTitles.length],
    }
  }),
)
