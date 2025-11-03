/**
 * Helper functions for creating TanStack Query query functions
 * These can be used with useQuery, useMutation, etc.
 */

import { apiClient, extractApiData, type ApiResponse } from "./axios";
import { QueryFunctionContext } from "@tanstack/react-query";

/**
 * Create a query function for GET requests
 * @example
 * const { data } = useQuery({
 *   queryKey: ['users'],
 *   queryFn: createQueryFn<User[]>('/api/v1/users')
 * })
 */
export function createQueryFn<T>(endpoint: string) {
  return async (): Promise<T> => {
    const response = await apiClient.get<ApiResponse<T>>(endpoint);
    return extractApiData<T>(response);
  };
}

/**
 * Create a query function with parameters
 * @example
 * const { data } = useQuery({
 *   queryKey: ['user', userId],
 *   queryFn: createQueryFnWithParams<User>((ctx) => `/api/v1/users/${ctx.queryKey[1]}`)
 * })
 */
export function createQueryFnWithParams<T>(
  endpointFn: (context: QueryFunctionContext) => string
) {
  return async (context: QueryFunctionContext): Promise<T> => {
    const endpoint = endpointFn(context);
    const response = await apiClient.get<ApiResponse<T>>(endpoint);
    return extractApiData<T>(response);
  };
}

/**
 * Create a mutation function for POST/PUT/DELETE requests
 * @example
 * const mutation = useMutation({
 *   mutationFn: createMutationFn<User, CreateUserData>('/api/v1/users', 'post')
 * })
 */
export function createMutationFn<TData, TVariables = unknown>(
  endpoint: string,
  method: "post" | "put" | "patch" | "delete" = "post"
) {
  return async (variables: TVariables): Promise<TData> => {
    const response = await apiClient[method]<ApiResponse<TData>>(
      endpoint,
      variables
    );
    return extractApiData<TData>(response);
  };
}

/**
 * Create a mutation function with dynamic endpoint
 * @example
 * const mutation = useMutation({
 *   mutationFn: createMutationFnWithEndpoint<User, UpdateUserData>(
 *     (vars) => `/api/v1/users/${vars.id}`,
 *     'put'
 *   )
 * })
 */
export function createMutationFnWithEndpoint<TData, TVariables = unknown>(
  endpointFn: (variables: TVariables) => string,
  method: "post" | "put" | "patch" | "delete" = "post"
) {
  return async (variables: TVariables): Promise<TData> => {
    const endpoint = endpointFn(variables);
    const response = await apiClient[method]<ApiResponse<TData>>(
      endpoint,
      variables
    );
    return extractApiData<TData>(response);
  };
}
