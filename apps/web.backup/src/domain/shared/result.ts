export type ServiceResult<TSuccess, TError> =
  | {
      ok: true;
      data: TSuccess;
    }
  | {
      ok: false;
      error: TError;
    };

export function success<TSuccess>(data: TSuccess): ServiceResult<TSuccess, never> {
  return { ok: true, data };
}

export function failure<TError>(error: TError): ServiceResult<never, TError> {
  return { ok: false, error };
}
