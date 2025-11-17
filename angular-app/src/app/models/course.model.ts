export interface CourseSection {
  name: string;
  currentEnrolment: number;
  maxEnrolment: number;
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
