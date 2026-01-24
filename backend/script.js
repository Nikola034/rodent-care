// Switch to the database
use rodent_registry

// Insert 20 rodents
db.rodents.insertMany([
  // 5 Beavers
  { species: "beaver", name: "Bucky", gender: "male", date_of_birth: ISODate("2023-03-15"), date_of_birth_estimated: false, chip_id: "BVR001", status: "active", notes: "Very friendly, loves to build dams", images: [], intake_date: ISODate("2024-01-10"), created_at: ISODate(), updated_at: ISODate(), created_by: "22222222-2222-2222-2222-222222222222", updated_by: "22222222-2222-2222-2222-222222222222" },
  { species: "beaver", name: "Timber", gender: "male", date_of_birth: ISODate("2022-08-20"), date_of_birth_estimated: true, chip_id: "BVR002", status: "active", notes: "Large male, dominant in the group", images: [], intake_date: ISODate("2024-02-15"), created_at: ISODate(), updated_at: ISODate(), created_by: "22222222-2222-2222-2222-222222222222", updated_by: "22222222-2222-2222-2222-222222222222" },
  { species: "beaver", name: "Willow", gender: "female", date_of_birth: ISODate("2024-01-05"), date_of_birth_estimated: false, chip_id: "BVR003", status: "quarantine", notes: "Recently rescued, needs observation", images: [], intake_date: ISODate("2025-01-15"), created_at: ISODate(), updated_at: ISODate(), created_by: "55555555-5555-5555-5555-555555555555", updated_by: "55555555-5555-5555-5555-555555555555" },
  { species: "beaver", name: "Maple", gender: "female", date_of_birth: ISODate("2023-06-10"), date_of_birth_estimated: false, chip_id: "BVR004", status: "active", notes: "Calm temperament, good with visitors", images: [], intake_date: ISODate("2024-03-20"), created_at: ISODate(), updated_at: ISODate(), created_by: "22222222-2222-2222-2222-222222222222", updated_by: "22222222-2222-2222-2222-222222222222" },
  { species: "beaver", name: "Chip", gender: "male", date_of_birth: ISODate("2024-04-12"), date_of_birth_estimated: true, chip_id: "BVR005", status: "medical_care", notes: "Recovering from minor injury", images: [], intake_date: ISODate("2025-01-02"), created_at: ISODate(), updated_at: ISODate(), created_by: "55555555-5555-5555-5555-555555555555", updated_by: "33333333-3333-3333-3333-333333333333" },
  
  // 5 Nutrias
  { species: "nutria", name: "Nutty", gender: "male", date_of_birth: ISODate("2023-05-20"), date_of_birth_estimated: false, chip_id: "NTR001", status: "active", notes: "Excellent swimmer, very social", images: [], intake_date: ISODate("2024-01-25"), created_at: ISODate(), updated_at: ISODate(), created_by: "22222222-2222-2222-2222-222222222222", updated_by: "22222222-2222-2222-2222-222222222222" },
  { species: "nutria", name: "River", gender: "female", date_of_birth: ISODate("2022-11-08"), date_of_birth_estimated: true, chip_id: "NTR002", status: "active", notes: "Mother of 3 pups", images: [], intake_date: ISODate("2024-02-10"), created_at: ISODate(), updated_at: ISODate(), created_by: "22222222-2222-2222-2222-222222222222", updated_by: "22222222-2222-2222-2222-222222222222" },
  { species: "nutria", name: "Muddy", gender: "male", date_of_birth: ISODate("2024-02-14"), date_of_birth_estimated: false, chip_id: "NTR003", status: "active", notes: "Young and playful", images: [], intake_date: ISODate("2024-06-01"), created_at: ISODate(), updated_at: ISODate(), created_by: "55555555-5555-5555-5555-555555555555", updated_by: "55555555-5555-5555-5555-555555555555" },
  { species: "nutria", name: "Splash", gender: "female", date_of_birth: ISODate("2023-09-30"), date_of_birth_estimated: false, chip_id: "NTR004", status: "adopted", notes: "Adopted to wildlife sanctuary", images: [], intake_date: ISODate("2024-01-15"), created_at: ISODate(), updated_at: ISODate(), created_by: "22222222-2222-2222-2222-222222222222", updated_by: "22222222-2222-2222-2222-222222222222" },
  { species: "nutria", name: "Whiskers", gender: "male", date_of_birth: ISODate("2023-12-25"), date_of_birth_estimated: true, chip_id: "NTR005", status: "quarantine", notes: "New arrival, standard quarantine", images: [], intake_date: ISODate("2025-01-20"), created_at: ISODate(), updated_at: ISODate(), created_by: "55555555-5555-5555-5555-555555555555", updated_by: "55555555-5555-5555-5555-555555555555" },
  
  // 5 Capybaras
  { species: "capybara", name: "Carlos", gender: "male", date_of_birth: ISODate("2021-07-15"), date_of_birth_estimated: false, chip_id: "CPB001", status: "active", notes: "Largest capybara in the shelter, very gentle", images: [], intake_date: ISODate("2023-08-20"), created_at: ISODate(), updated_at: ISODate(), created_by: "22222222-2222-2222-2222-222222222222", updated_by: "22222222-2222-2222-2222-222222222222" },
  { species: "capybara", name: "Luna", gender: "female", date_of_birth: ISODate("2022-04-10"), date_of_birth_estimated: false, chip_id: "CPB002", status: "active", notes: "Loves mud baths", images: [], intake_date: ISODate("2023-10-05"), created_at: ISODate(), updated_at: ISODate(), created_by: "22222222-2222-2222-2222-222222222222", updated_by: "22222222-2222-2222-2222-222222222222" },
  { species: "capybara", name: "Coco", gender: "female", date_of_birth: ISODate("2023-01-22"), date_of_birth_estimated: true, chip_id: "CPB003", status: "active", notes: "Bonded pair with Carlos", images: [], intake_date: ISODate("2024-04-15"), created_at: ISODate(), updated_at: ISODate(), created_by: "55555555-5555-5555-5555-555555555555", updated_by: "55555555-5555-5555-5555-555555555555" },
  { species: "capybara", name: "Pedro", gender: "male", date_of_birth: ISODate("2024-03-08"), date_of_birth_estimated: false, chip_id: "CPB004", status: "medical_care", notes: "Dental treatment ongoing", images: [], intake_date: ISODate("2024-09-12"), created_at: ISODate(), updated_at: ISODate(), created_by: "22222222-2222-2222-2222-222222222222", updated_by: "33333333-3333-3333-3333-333333333333" },
  { species: "capybara", name: "Bella", gender: "female", date_of_birth: ISODate("2022-12-01"), date_of_birth_estimated: false, chip_id: "CPB005", status: "active", notes: "Very photogenic, used for educational programs", images: [], intake_date: ISODate("2024-02-28"), created_at: ISODate(), updated_at: ISODate(), created_by: "22222222-2222-2222-2222-222222222222", updated_by: "22222222-2222-2222-2222-222222222222" },
  
  // 5 Guinea Pigs
  { species: "guinea_pig", name: "Patches", gender: "male", date_of_birth: ISODate("2024-06-15"), date_of_birth_estimated: false, chip_id: "GPG001", status: "active", notes: "Tricolor coat, very vocal", images: [], intake_date: ISODate("2024-08-01"), created_at: ISODate(), updated_at: ISODate(), created_by: "55555555-5555-5555-5555-555555555555", updated_by: "55555555-5555-5555-5555-555555555555" },
  { species: "guinea_pig", name: "Oreo", gender: "male", date_of_birth: ISODate("2024-04-20"), date_of_birth_estimated: false, chip_id: "GPG002", status: "active", notes: "Black and white, best friends with Patches", images: [], intake_date: ISODate("2024-08-01"), created_at: ISODate(), updated_at: ISODate(), created_by: "55555555-5555-5555-5555-555555555555", updated_by: "55555555-5555-5555-5555-555555555555" },
  { species: "guinea_pig", name: "Caramel", gender: "female", date_of_birth: ISODate("2024-02-10"), date_of_birth_estimated: true, chip_id: "GPG003", status: "active", notes: "Golden coat, loves vegetables", images: [], intake_date: ISODate("2024-05-20"), created_at: ISODate(), updated_at: ISODate(), created_by: "22222222-2222-2222-2222-222222222222", updated_by: "22222222-2222-2222-2222-222222222222" },
  { species: "guinea_pig", name: "Snowball", gender: "female", date_of_birth: ISODate("2024-08-05"), date_of_birth_estimated: false, chip_id: "GPG004", status: "quarantine", notes: "New arrival, albino guinea pig", images: [], intake_date: ISODate("2025-01-18"), created_at: ISODate(), updated_at: ISODate(), created_by: "55555555-5555-5555-5555-555555555555", updated_by: "55555555-5555-5555-5555-555555555555" },
  { species: "guinea_pig", name: "Peanut", gender: "male", date_of_birth: ISODate("2023-11-30"), date_of_birth_estimated: false, chip_id: "GPG005", status: "adopted", notes: "Adopted to loving family", images: [], intake_date: ISODate("2024-03-10"), created_at: ISODate(), updated_at: ISODate(), created_by: "22222222-2222-2222-2222-222222222222", updated_by: "22222222-2222-2222-2222-222222222222" }
])

// Now insert medical records for the rodents
// First, get the rodent IDs
var rodents = db.rodents.find().toArray()
var vetId = "33333333-3333-3333-3333-333333333333"
var vetName = "sarah_vet"

// Create medical records
var medicalRecords = []

rodents.forEach(function(rodent) {
  // Each rodent gets 1-3 medical records
  
  // Check-up record for all
  medicalRecords.push({
    rodent_id: rodent._id,
    record_type: "check_up",
    date: ISODate("2024-12-15"),
    description: "Routine health check-up",
    diagnosis: "Healthy, no concerns",
    medications: [],
    test_results: "Weight: normal, Teeth: good condition, Coat: healthy",
    next_appointment: ISODate("2025-06-15"),
    veterinarian_id: vetId,
    veterinarian_name: vetName,
    created_at: ISODate(),
    updated_at: ISODate()
  })
  
  // Vaccination for most
  if (rodent.status !== "adopted") {
    medicalRecords.push({
      rodent_id: rodent._id,
      record_type: "vaccination",
      date: ISODate("2024-11-01"),
      description: "Annual vaccination",
      diagnosis: null,
      medications: [{
        name: "Rodent Multivaccine",
        dosage: "0.5ml",
        frequency: "Once",
        duration: null,
        notes: "Annual booster"
      }],
      test_results: null,
      next_appointment: ISODate("2025-11-01"),
      veterinarian_id: vetId,
      veterinarian_name: vetName,
      created_at: ISODate(),
      updated_at: ISODate()
    })
  }
  
  // Treatment for those in medical care or quarantine
  if (rodent.status === "medical_care" || rodent.status === "quarantine") {
    medicalRecords.push({
      rodent_id: rodent._id,
      record_type: "treatment",
      date: ISODate("2025-01-20"),
      description: rodent.status === "medical_care" ? "Ongoing treatment for injury/condition" : "Quarantine protocol treatment",
      diagnosis: rodent.status === "medical_care" ? "Minor condition requiring treatment" : "Preventive care during quarantine",
      medications: [{
        name: "Antibiotics",
        dosage: "5mg/kg",
        frequency: "Twice daily",
        duration: "7 days",
        notes: "Administer with food"
      }, {
        name: "Vitamin Supplement",
        dosage: "2ml",
        frequency: "Once daily",
        duration: "14 days",
        notes: null
      }],
      test_results: "Blood work: normal, No parasites detected",
      next_appointment: ISODate("2025-02-01"),
      veterinarian_id: vetId,
      veterinarian_name: vetName,
      created_at: ISODate(),
      updated_at: ISODate()
    })
  }
})

db.medical_records.insertMany(medicalRecords)

// Print summary
print("Inserted " + db.rodents.countDocuments() + " rodents")
print("Inserted " + db.medical_records.countDocuments() + " medical records")