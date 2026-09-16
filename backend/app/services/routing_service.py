from typing import Optional
from app.models.department import CategoryDepartmentMap, Department, Category

class RoutingService:
    @staticmethod
    def get_department_for_category(category_id: int) -> Optional[Department]:
        """
        Look up category_department_map to determine assigned Department.
        """
        mapping = CategoryDepartmentMap.query.filter_by(category_id=category_id).first()
        if mapping and mapping.department:
            return mapping.department
        
        # Fallback to general works or first department
        return Department.query.first()

    @staticmethod
    def get_department_by_category_name(category_name: str) -> Optional[Department]:
        cat = Category.query.filter(Category.name.ilike(f"%{category_name}%")).first()
        if cat:
            return RoutingService.get_department_for_category(cat.id)
        return Department.query.first()

routing_service = RoutingService()
