import useSWR, { mutate } from 'swr';
import { useMemo } from 'react';
import axiosServices, { fetcher } from 'utils/axios';

// types
import { Employee, Shift, CreateShiftRequest, UpdateShiftRequest, ShiftFilters, MyShiftsFilters } from 'types/entities';

const endpoints = {
  employees: '/employee/employees/',
  shifts: '/employee/shifts',
  myShifts: '/employee/my-shifts/'
};

// Employee API functions
export function useGetEmployees() {
  const { data, isLoading, error, isValidating } = useSWR(endpoints.employees, fetcher);

  const memoizedValue = useMemo(
    () => ({
      employees: data as Employee[],
      employeesLoading: isLoading,
      employeesError: error,
      employeesValidating: isValidating,
      employeesEmpty: !isLoading && !data?.length
    }),
    [data, error, isLoading, isValidating]
  );

  return memoizedValue;
}

// Shifts API functions
export function useGetShifts(filters?: ShiftFilters) {
  const queryParams = new URLSearchParams();
  if (filters?.start) queryParams.append('start', filters.start);
  if (filters?.end) queryParams.append('end', filters.end);
  if (filters?.employee_id) queryParams.append('employee_id', filters.employee_id);
  
  const url = `${endpoints.shifts}?${queryParams.toString()}`;
  
  const { data, isLoading, error, isValidating } = useSWR(url, fetcher);

  const memoizedValue = useMemo(
    () => ({
      shifts: data as Shift[],
      shiftsLoading: isLoading,
      shiftsError: error,
      shiftsValidating: isValidating,
      shiftsEmpty: !isLoading && !data?.length
    }),
    [data, error, isLoading, isValidating]
  );

  return memoizedValue;
}

export function useGetMyShifts(filters?: MyShiftsFilters) {
  const queryParams = new URLSearchParams();
  if (filters?.start) queryParams.append('start', filters.start);
  if (filters?.end) queryParams.append('end', filters.end);
  
  const url = `${endpoints.myShifts}?${queryParams.toString()}`;
  
  const { data, isLoading, error, isValidating } = useSWR(url, fetcher);

  const memoizedValue = useMemo(
    () => ({
      myShifts: data as Shift[],
      myShiftsLoading: isLoading,
      myShiftsError: error,
      myShiftsValidating: isValidating,
      myShiftsEmpty: !isLoading && !data?.length
    }),
    [data, error, isLoading, isValidating]
  );

  return memoizedValue;
}

// Shift CRUD operations
export async function createShift(shiftData: CreateShiftRequest): Promise<Shift> {
  try {
    console.log('Creating shift with data:', shiftData);
    console.log('API endpoint:', endpoints.shifts);
    const response = await axiosServices.post(`${endpoints.shifts}/`, shiftData);
    console.log('Shift created successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error creating shift:', error);
    throw error;
  }
}

export async function updateShift(shiftId: string, shiftData: UpdateShiftRequest): Promise<Shift> {
  try {
    console.log('Updating shift:', shiftId, 'with data:', shiftData);
    const response = await axiosServices.put(`${endpoints.shifts}/${shiftId}/`, shiftData);
    console.log('Shift updated successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error updating shift:', error);
    throw error;
  }
}

export async function deleteShift(shiftId: string): Promise<void> {
  try {
    console.log('Deleting shift:', shiftId);
    await axiosServices.delete(`${endpoints.shifts}/${shiftId}/`);
    console.log('Shift deleted successfully');
  } catch (error) {
    console.error('Error deleting shift:', error);
    throw error;
  }
}

// Employee CRUD operations
export async function createEmployee(employeeData: { first_name: string; last_name: string; email: string; company: string }): Promise<Employee> {
  try {
    console.log('Creating employee with data:', employeeData);
    const response = await axiosServices.post(endpoints.employees, employeeData);
    console.log('Employee created successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error creating employee:', error);
    throw error;
  }
}

export async function updateEmployee(employeeId: string, employeeData: { first_name?: string; last_name?: string; email?: string }): Promise<Employee> {
  try {
    console.log('Updating employee:', employeeId, 'with data:', employeeData);
    const response = await axiosServices.put(`${endpoints.employees}${employeeId}/`, employeeData);
    console.log('Employee updated successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error updating employee:', error);
    throw error;
  }
}

export async function deleteEmployee(employeeId: string): Promise<void> {
  try {
    console.log('Deleting employee:', employeeId);
    await axiosServices.delete(`${endpoints.employees}${employeeId}/`);
    console.log('Employee deleted successfully');
  } catch (error) {
    console.error('Error deleting employee:', error);
    throw error;
  }
}

// Utility functions for cache invalidation
export function invalidateShiftsCache() {
  mutate((key) => typeof key === 'string' && key.includes('employee/shifts'));
  mutate((key) => typeof key === 'string' && key.includes('employee/my-shifts'));
}

export function invalidateEmployeesCache() {
  mutate((key) => typeof key === 'string' && key.includes('employee/employees'));
}

// Note: Role-based helper functions have been moved to role.api.ts
