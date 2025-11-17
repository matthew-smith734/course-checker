import { Injectable } from '@angular/core';
import { XMLParser } from 'fast-xml-parser';
import { SectionDetail } from './course.service';

@Injectable({
  providedIn: 'root'
})
export class XmlParserService {
  private parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      parseTagValue: true
    });
  }

  /**
   * Extract sections from XML payload - mirrors Java's extractSectionsDetails method
   */
  extractSectionsFromXml(xmlContent: string): Promise<SectionDetail[]> {
    return new Promise((resolve, reject) => {
      // Clean up the response - mirrors Java's cleaning logic
      xmlContent = xmlContent.trim().replace(/^([\W]+)</, '<');
      
      try {
        const result = this.parser.parse(xmlContent);
        const sections: SectionDetail[] = [];
        
        // Navigate to the sections array in the XML structure
        const payload = result?.payload;
        if (!payload) {
          resolve(sections);
          return;
        }

        const pageableCourse = payload.pageableCourse;
        if (!pageableCourse) {
          resolve(sections);
          return;
        }

        const courses = pageableCourse.courses?.courses;
        if (!courses) {
          resolve(sections);
          return;
        }

        // Handle both single course and array of courses
        const courseArray = Array.isArray(courses) ? courses : [courses];

        // Iterate through courses and extract sections
        courseArray.forEach((course: any) => {
          const courseSections = course.sections?.sections;
          if (courseSections) {
            const sectionArray = Array.isArray(courseSections) ? courseSections : [courseSections];
            
            sectionArray.forEach((section: any) => {
              const name = section.name || '';
              const currentEnrolment = section.currentEnrolment?.toString() || '0';
              const maxEnrolment = section.maxEnrolment?.toString() || '0';
              
              sections.push({
                name,
                currentEnrolment,
                maxEnrolment
              });
            });
          }
        });

        resolve(sections);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Check if course exists in search results - mirrors Java's content.contains logic
   */
  courseExistsInSearch(xmlContent: string, courseTitle: string): boolean {
    return xmlContent.includes(courseTitle);
  }
}
