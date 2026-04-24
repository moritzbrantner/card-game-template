'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';

import {
  buildSubmissionMessage,
  departmentOptions,
  employeeProfileDefaultValues,
  type EmployeeProfileFormValues,
} from '@/src/domain/forms/employee-profile-form';

export function EmployeeProfileForm() {
  const [submissionMessage, setSubmissionMessage] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeProfileFormValues>({
    defaultValues: employeeProfileDefaultValues,
  });

  const onSubmit = (values: EmployeeProfileFormValues) => {
    setSubmissionMessage(buildSubmissionMessage(values));
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1">
          <span className="text-sm font-medium">First name</span>
          <input
            className="w-full rounded border p-2"
            {...register('firstName', { required: true })}
          />
          {errors.firstName && (
            <span className="text-sm text-red-600">
              First name is required.
            </span>
          )}
        </label>

        <label className="space-y-1">
          <span className="text-sm font-medium">Last name</span>
          <input
            className="w-full rounded border p-2"
            {...register('lastName', { required: true })}
          />
          {errors.lastName && (
            <span className="text-sm text-red-600">Last name is required.</span>
          )}
        </label>

        <label className="space-y-1">
          <span className="text-sm font-medium">Email</span>
          <input
            type="email"
            className="w-full rounded border p-2"
            {...register('email', {
              required: true,
              pattern: /\S+@\S+\.\S+/,
            })}
          />
          {errors.email && (
            <span className="text-sm text-red-600">
              Please enter a valid email.
            </span>
          )}
        </label>

        <label className="space-y-1">
          <span className="text-sm font-medium">Phone</span>
          <input
            className="w-full rounded border p-2"
            {...register('phone', {
              required: true,
              minLength: 10,
            })}
          />
          {errors.phone && (
            <span className="text-sm text-red-600">
              Phone is required and must be at least 10 digits.
            </span>
          )}
        </label>

        <label className="space-y-1">
          <span className="text-sm font-medium">Age</span>
          <input
            type="number"
            className="w-full rounded border p-2"
            {...register('age', {
              valueAsNumber: true,
              min: 18,
              max: 100,
            })}
          />
          {errors.age && (
            <span className="text-sm text-red-600">
              Age must be between 18 and 100.
            </span>
          )}
        </label>

        <label className="space-y-1">
          <span className="text-sm font-medium">Job title</span>
          <input
            className="w-full rounded border p-2"
            {...register('jobTitle', { required: true })}
          />
          {errors.jobTitle && (
            <span className="text-sm text-red-600">Job title is required.</span>
          )}
        </label>

        <label className="space-y-1">
          <span className="text-sm font-medium">Start date</span>
          <input
            type="date"
            className="w-full rounded border p-2"
            {...register('startDate', { required: true })}
          />
          {errors.startDate && (
            <span className="text-sm text-red-600">
              Start date is required.
            </span>
          )}
        </label>

        <label className="space-y-1">
          <span className="text-sm font-medium">Department</span>
          <select
            className="w-full rounded border p-2"
            {...register('department', { required: true })}
          >
            {departmentOptions.map((department) => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </select>
          {errors.department && (
            <span className="text-sm text-red-600">
              Department is required.
            </span>
          )}
        </label>
      </div>

      <label className="flex items-center gap-2">
        <input type="checkbox" {...register('newsletter')} />
        <span className="text-sm font-medium">Subscribe to newsletter</span>
      </label>

      <label className="space-y-1">
        <span className="text-sm font-medium">Short bio</span>
        <textarea
          className="w-full rounded border p-2"
          rows={4}
          {...register('bio', {
            required: true,
            minLength: 20,
          })}
        />
        {errors.bio && (
          <span className="text-sm text-red-600">
            Bio must be at least 20 characters.
          </span>
        )}
      </label>

      <button
        type="submit"
        className="rounded bg-black px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-70"
        disabled={isSubmitting}
      >
        Submit profile
      </button>

      {submissionMessage && (
        <p
          role="status"
          className="rounded bg-green-100 p-3 text-sm text-green-900"
        >
          {submissionMessage}
        </p>
      )}
    </form>
  );
}
