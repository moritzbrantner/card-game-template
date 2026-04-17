import * as z from 'zod';

import { updateAdminUserRoleUseCase } from '@/src/domain/admin-users/use-cases';
import { createApiRoute } from '@/src/http/route';
import { problem, ProblemError } from '@/src/http/errors';

const roleBodySchema = z.object({
  role: z.enum(['SUPERADMIN', 'ADMIN', 'MANAGER', 'USER']),
});

function mapRoleManagementProblem(code: 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT', detail: string) {
  const status = code === 'FORBIDDEN' ? 403 : code === 'NOT_FOUND' ? 404 : 409;
  return new ProblemError(problem('/problems/admin-user-role', 'Unable to update role', status, detail));
}

const patchRoute = createApiRoute({
  action: 'admin.users.updateRole',
  featureKey: 'admin.users',
  auth: true,
  permission: 'admin.roles.edit',
  bodySchema: roleBodySchema,
  async handler({ actorId, body, request }) {
    const pathnameParts = new URL(request.url).pathname.split('/');
    const userId = pathnameParts[pathnameParts.length - 2] ?? '';
    const result = await updateAdminUserRoleUseCase({
      actorUserId: actorId!,
      targetUserId: userId,
      nextRole: body.role,
    });

    if (!result.ok) {
      throw mapRoleManagementProblem(result.error.code, result.error.message);
    }

    return {
      ok: true,
      role: result.data.role,
    };
  },
});

export const PATCH = patchRoute;
