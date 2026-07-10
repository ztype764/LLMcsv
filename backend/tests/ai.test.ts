import { validateAndCleanRecord } from '../src/ai';

describe('AI Validation and Cleansing Unit Tests', () => {
  it('should skip record if both email and mobile are missing', () => {
    const rawData = {
      name: 'No Contacts Lead',
      email: '',
      mobile_without_country_code: '',
    };
    const result = validateAndCleanRecord(rawData, 2);

    expect(result.status).toBe('skipped');
    expect(result.skip_reason).toContain('Missing both email');
  });

  it('should keep record if only email is present and mobile is missing', () => {
    const rawData = {
      name: 'Only Email',
      email: 'only.email@test.com',
      mobile_without_country_code: '',
      crm_status: 'GOOD_LEAD_FOLLOW_UP',
    };
    const result = validateAndCleanRecord(rawData, 3);

    expect(result.status).toBe('success');
    expect(result.data.email).toBe('only.email@test.com');
    expect(result.data.mobile_without_country_code).toBe('');
  });

  it('should keep record if only mobile is present and email is missing', () => {
    const rawData = {
      name: 'Only Mobile',
      email: '',
      mobile_without_country_code: '9876543210',
      crm_status: 'GOOD_LEAD_FOLLOW_UP',
    };
    const result = validateAndCleanRecord(rawData, 4);

    expect(result.status).toBe('success');
    expect(result.data.email).toBe('');
    expect(result.data.mobile_without_country_code).toBe('9876543210');
  });

  it('should normalize invalid date formats to fallback', () => {
    const rawData = {
      name: 'Bad Date',
      email: 'test@test.com',
      created_at: 'invalid-date-string',
      crm_status: 'GOOD_LEAD_FOLLOW_UP',
    };
    const result = validateAndCleanRecord(rawData, 5);

    expect(result.status).toBe('success');
    // It should fallback to current ISO/Date format
    expect(new Date(result.data.created_at || '').getTime()).not.toBeNaN();
  });

  it('should parse valid dates correctly', () => {
    const rawData = {
      name: 'Good Date',
      email: 'test@test.com',
      created_at: '2026-05-13 14:20:48',
      crm_status: 'GOOD_LEAD_FOLLOW_UP',
    };
    const result = validateAndCleanRecord(rawData, 6);

    expect(result.status).toBe('success');
    expect(result.data.created_at).toContain('2026-05-13');
  });

  it('should fallback invalid CRM statuses to GOOD_LEAD_FOLLOW_UP', () => {
    const rawData = {
      name: 'Bad Status',
      email: 'test@test.com',
      crm_status: 'NOT_A_VALID_STATUS',
    };
    const result = validateAndCleanRecord(rawData, 7);

    expect(result.status).toBe('success');
    expect(result.data.crm_status).toBe('GOOD_LEAD_FOLLOW_UP');
  });

  it('should clear invalid data sources to blank', () => {
    const rawData = {
      name: 'Bad Source',
      email: 'test@test.com',
      crm_status: 'GOOD_LEAD_FOLLOW_UP',
      data_source: 'random_source_not_allowed',
    };
    const result = validateAndCleanRecord(rawData, 8);

    expect(result.status).toBe('success');
    expect(result.data.data_source).toBe('');
  });

  it('should keep valid data sources', () => {
    const rawData = {
      name: 'Good Source',
      email: 'test@test.com',
      crm_status: 'GOOD_LEAD_FOLLOW_UP',
      data_source: 'eden_park',
    };
    const result = validateAndCleanRecord(rawData, 9);

    expect(result.status).toBe('success');
    expect(result.data.data_source).toBe('eden_park');
  });

  it('should split multiple emails and append extras to notes', () => {
    const rawData = {
      name: 'Multi Email',
      email: 'first@test.com, second@test.com',
      mobile_without_country_code: '9876543210',
      crm_status: 'GOOD_LEAD_FOLLOW_UP',
      crm_note: 'Initial remarks',
    };
    const result = validateAndCleanRecord(rawData, 10);

    expect(result.status).toBe('success');
    expect(result.data.email).toBe('first@test.com');
    expect(result.data.crm_note).toContain('Extra emails: second@test.com');
  });

  it('should split multiple phone numbers and append extras to notes', () => {
    const rawData = {
      name: 'Multi Phone',
      email: 'test@test.com',
      mobile_without_country_code: '9876543210, 8765432109',
      crm_status: 'GOOD_LEAD_FOLLOW_UP',
      crm_note: '',
    };
    const result = validateAndCleanRecord(rawData, 11);

    expect(result.status).toBe('success');
    expect(result.data.mobile_without_country_code).toBe('9876543210');
    expect(result.data.crm_note).toBe('Extra mobiles: 8765432109');
  });
});
