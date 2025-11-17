import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CourseResult {
  courseName: string;
  sections: SectionDetail[];
}

export interface SectionDetail {
  name: string;
  currentEnrolment: string;
  maxEnrolment: string;
}

@Injectable({
  providedIn: 'root'
})
export class CourseService {
  constructor(private http: HttpClient) {}

  /**
   * Fetch URL with GET or POST method - mirrors Java's fetchUrl method
   */
  fetchUrl(url: string, method: string, postData?: string): Observable<string> {
    if (method === 'POST' && postData) {
      const headers = new HttpHeaders({
        'Content-Type': 'application/json; utf-8',
        'Accept': '*/*'
      });
      return this.http.post(url, postData, { 
        headers, 
        responseType: 'text' 
      });
    } else {
      return this.http.get(url, { responseType: 'text' });
    }
  }

  /**
   * Search for course titles - mirrors Java's first API call
   */
  searchCourseTitles(code: string, semester: string): Observable<string> {
    const sanitizedCode = code.replace(/1$/, '');
    const url = `https://api.easi.utoronto.ca/ttb/getOptimizedMatchingCourseTitles?term=${sanitizedCode}&divisions=ARTSC&sessions=${semester}&lowerThreshold=50&upperThreshold=200`;
    return this.fetchUrl(url, 'GET');
  }

  /**
   * Get pageable courses - mirrors Java's second API call
   */
  getPageableCourses(sanitizedCode: string, course: string, semester: string): Observable<string> {
    const url = 'https://api.easi.utoronto.ca/ttb/getPageableCourses';
    const postData = JSON.stringify({
      courseCodeAndTitleProps: {
        courseCode: sanitizedCode,
        courseTitle: course,
        courseSectionCode: "",
        searchCourseDescription: true
      },
      departmentProps: [],
      campuses: [],
      sessions: [semester],
      requirementProps: [],
      instructor: "",
      courseLevels: [],
      deliveryModes: [],
      dayPreferences: [],
      timePreferences: [],
      divisions: ["ARTSC"],
      creditWeights: [],
      availableSpace: false,
      waitListable: false,
      page: 1,
      pageSize: 20,
      direction: "asc"
    });
    return this.fetchUrl(url, 'POST', postData);
  }
}
