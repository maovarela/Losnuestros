import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.weekly(
  "digest semanal",
  { hourUTC: 13, minuteUTC: 0, dayOfWeek: "sunday" },
  internal.email.sendWeeklyDigest,
);

export default crons;
