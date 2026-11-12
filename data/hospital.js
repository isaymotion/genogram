/* Hospital and program details, SHARED across Dr. Navarro's apps.
   Edit them here and copy this file to the other apps' data/ folders; do not hardcode them in individual apps. */
window.HOSPITAL = {
  name: 'Mariveles Mental Wellness and General Hospital',
  shortName: 'MMWGH',
  program: 'Psychiatry and Public Mental Health Residency Training Program',
  province: 'Bataan',
  posts: [
    { code: 'MW', name: 'Male Ward' },
    { code: 'FW', name: 'Female Ward' },
    { code: 'GND', name: 'Geriatric and Neurodevelopmental' },
    { code: 'ACIU1', name: 'Acute Crisis Intervention Unit 1' },
    { code: 'ACIU2', name: 'Acute Crisis Intervention Unit 2' },
    { code: 'ER', name: 'ER triage' },
    { code: 'OPU', name: 'OPU' }
  ],
  yearLevels: [1, 2, 3],
  formPrefix: 'MMH-'
};
