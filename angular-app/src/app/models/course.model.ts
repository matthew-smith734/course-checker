export interface MeetingTime {
  day: string;
  startTime: string;
  endTime: string;
  room?: string;
}

export interface CourseSection {
  name: string;
  currentEnrolment: number;
  maxEnrolment: number;
  meetingTimes: MeetingTime[];
}

export interface CourseDetails {
  courseName: string;
  sections: CourseSection[];
}

export interface CourseSearchResult {
  found: boolean;
  courseName: string;
  sections?: CourseSection[];
  error?: string;
}
