jest.mock("../dist/utils/db", () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
  },
}));

const pool = require("../dist/utils/db").default;
const {
  getStudentTimetableSchedule,
} = require("../dist/controllers/timetableController");
const { getStudentSchedule } = require("../dist/controllers/attendanceController");

const createResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("student schedule fallbacks", () => {
  let consoleErrorSpy;

  beforeEach(() => {
    pool.query.mockReset();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test("returns an empty timetable payload when mapping or timetable tables are unavailable", async () => {
    pool.query
      .mockRejectedValueOnce({ code: "42P01" })
      .mockResolvedValueOnce({ rows: [{ batch_id: 5 }] })
      .mockRejectedValueOnce({ code: "42P01" });

    const req = { user: { userId: 43 } };
    const res = createResponse();

    await getStudentTimetableSchedule(req, res);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ today: [], upcoming: [] });
  });

  test("returns the demo attendance schedule when attendance tables are unavailable", async () => {
    pool.query
      .mockRejectedValueOnce({ code: "42P01" })
      .mockResolvedValueOnce({ rows: [{ batch_id: 5 }] })
      .mockRejectedValueOnce({ code: "42P01" });

    const req = { user: { userId: 43 } };
    const res = createResponse();

    await getStudentSchedule(req, res);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledTimes(1);

    const payload = res.json.mock.calls[0][0];
    expect(payload.today[0].subject).toBe("Data Structures & Algorithms");
    expect(payload.upcoming[0].subject).toBe("Database Management Systems");
  });
});