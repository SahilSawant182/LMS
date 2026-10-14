export interface ProgrammingExerciseTestCase {
  input: string;
  output: string;
  expected_output?: string;
  explanation?: string;
}

export interface LMSProgrammingExercise {
  name: string;
  title: string;
  problem_statement: string;
  language: string;
  test_cases: ProgrammingExerciseTestCase[];
  difficulty?: 'Easy' | 'Medium' | 'Hard' | string;
  course?: string;
  chapter?: string;
  lesson?: string;
  creation?: string;
  modified?: string;
  owner?: string;
}

export interface CreateProgrammingExercisePayload {
  title: string;
  problem_statement: string;
  language: string;
  test_cases: ProgrammingExerciseTestCase[];
  [key: string]: any;
}

export interface LMSProgrammingExerciseSubmission {
  name: string;
  exercise: string;
  exercise_title?: string;
  member: string;
  member_name?: string;
  member_image?: string;
  code?: string;
  language?: string;
  status?: 'Passed' | 'Failed' | 'Submitted' | 'Pending' | 'Error' | string;
  test_cases_passed?: number;
  total_test_cases?: number;
  output?: string;
  error_message?: string;
  creation?: string;
  modified?: string;
  owner?: string;
}

export interface SubmissionListApiResponse {
  status: string;
  count: number;
  data: LMSProgrammingExerciseSubmission[];
}

export interface CreateProgrammingExerciseSubmissionPayload {
  exercise: string;
  code: string;
  language?: string;
  member?: string;
  status?: string;
  [key: string]: any;
}
