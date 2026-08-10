from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsWorkspaceMember(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        workspace = getattr(obj, "workspace", obj)
        return workspace.members.filter(user=request.user).exists() or workspace.owner_id == request.user.id
