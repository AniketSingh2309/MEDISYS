const test = require("node:test");
const assert = require("node:assert/strict");
const { resolveNurseAssignment } = require("./nurseAssignment");

test("ward_based mode: assigns the nurse on the roster for that ward/shift/day", () => {
  const result = resolveNurseAssignment({
    mode: "ward_based",
    wardId: 1,
    doctorUserId: "DR-1",
    shift: "Morning",
    dayOfWeek: 2,
    roster: [
      { nurseUserId: "NR-1", wardId: 1, shift: "Morning", dayOfWeek: 2 },
      { nurseUserId: "NR-2", wardId: 2, shift: "Morning", dayOfWeek: 2 },
    ],
    teams: [],
  });

  assert.equal(result.nurseUserId, "NR-1");
  assert.equal(result.source, "ward_based");
  assert.equal(result.alert, false);
});

test("doctor_team mode: assigns the doctor's team nurse when that nurse is on shift", () => {
  const result = resolveNurseAssignment({
    mode: "doctor_team",
    wardId: 1,
    doctorUserId: "DR-1",
    shift: "Evening",
    dayOfWeek: 3,
    roster: [
      { nurseUserId: "NR-9", wardId: 1, shift: "Evening", dayOfWeek: 3 },
      { nurseUserId: "NR-5", wardId: 5, shift: "Evening", dayOfWeek: 3 },
    ],
    teams: [{ doctorUserId: "DR-1", nurseUserId: "NR-5" }],
  });

  assert.equal(result.nurseUserId, "NR-5");
  assert.equal(result.source, "doctor_team");
  assert.equal(result.alert, false);
});

test("doctor_team mode: falls back to ward roster when the team nurse is not on shift", () => {
  const result = resolveNurseAssignment({
    mode: "doctor_team",
    wardId: 1,
    doctorUserId: "DR-1",
    shift: "Night",
    dayOfWeek: 4,
    roster: [
      // NR-5 (the doctor's team nurse) is only on the roster for a different shift.
      { nurseUserId: "NR-5", wardId: 5, shift: "Morning", dayOfWeek: 4 },
      { nurseUserId: "NR-1", wardId: 1, shift: "Night", dayOfWeek: 4 },
    ],
    teams: [{ doctorUserId: "DR-1", nurseUserId: "NR-5" }],
  });

  assert.equal(result.nurseUserId, "NR-1");
  assert.equal(result.source, "ward_based");
  assert.equal(result.alert, false);
});

test("doctor_team mode: falls back to ward roster when the doctor has no team at all", () => {
  const result = resolveNurseAssignment({
    mode: "doctor_team",
    wardId: 1,
    doctorUserId: "DR-2",
    shift: "Morning",
    dayOfWeek: 1,
    roster: [{ nurseUserId: "NR-1", wardId: 1, shift: "Morning", dayOfWeek: 1 }],
    teams: [{ doctorUserId: "DR-1", nurseUserId: "NR-5" }],
  });

  assert.equal(result.nurseUserId, "NR-1");
  assert.equal(result.source, "ward_based");
});

test("no roster entry at all: raises an alert instead of failing silently", () => {
  const result = resolveNurseAssignment({
    mode: "ward_based",
    wardId: 1,
    doctorUserId: "DR-1",
    shift: "Night",
    dayOfWeek: 6,
    roster: [],
    teams: [],
  });

  assert.equal(result.nurseUserId, null);
  assert.equal(result.source, "none");
  assert.equal(result.alert, true);
});

test("no roster entry for this ward/shift, even though other wards have coverage", () => {
  const result = resolveNurseAssignment({
    mode: "ward_based",
    wardId: 3,
    doctorUserId: null,
    shift: "Morning",
    dayOfWeek: 2,
    roster: [{ nurseUserId: "NR-1", wardId: 1, shift: "Morning", dayOfWeek: 2 }],
    teams: [],
  });

  assert.equal(result.nurseUserId, null);
  assert.equal(result.alert, true);
});
