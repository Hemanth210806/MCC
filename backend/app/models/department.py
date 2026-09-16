from app.extensions import db

class Department(db.Model):
    __tablename__ = 'departments'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), unique=True, nullable=False)
    description = db.Column(db.Text, nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description
        }

class Category(db.Model):
    __tablename__ = 'categories'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.Text, nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description
        }

class CategoryDepartmentMap(db.Model):
    __tablename__ = 'category_department_map'

    id = db.Column(db.Integer, primary_key=True)
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id'), nullable=False)
    department_id = db.Column(db.Integer, db.ForeignKey('departments.id'), nullable=False)

    category = db.relationship('Category', backref='department_maps')
    department = db.relationship('Department', backref='category_maps')

    def to_dict(self):
        return {
            'id': self.id,
            'category_id': self.category_id,
            'category_name': self.category.name if self.category else None,
            'department_id': self.department_id,
            'department_name': self.department.name if self.department else None
        }
