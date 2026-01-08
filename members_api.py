"""
MEMBERS API - Employee/Member Management System
Handles member registration, punch in/out verification
Email is the unique identifier for members
"""
from flask import Blueprint, jsonify, request, make_response
from datetime import datetime
import psycopg
from psycopg.rows import dict_row
import os
import traceback

members_bp = Blueprint('members', __name__, url_prefix='/api/members')

DATABASE_URL = os.environ.get('DATABASE_URL', '')

# Fallback to hardcoded database URL
if not DATABASE_URL:
    DATABASE_URL = "postgresql://work_eye_db_user:DeXsKDcQNO6rpdQypAjDECEjqRXVa8hr@dpg-d52ij3ali9vc73f8tn40-a/work_eye_db"

if DATABASE_URL.startswith('postgres://'):
    DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)

# ADD CORS TO BLUEPRINT RESPONSES
@members_bp.after_request
def add_blueprint_cors(response):
    """Add CORS headers to all blueprint responses"""
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, Accept'
    response.headers['Access-Control-Expose-Headers'] = '*'
    response.headers['Access-Control-Max-Age'] = '3600'
    print(f"✅ Blueprint CORS added to {request.method} {request.path} -> {response.status_code}")
    return response

def get_db():
    """Get database connection"""
    try:
        conn = psycopg.connect(DATABASE_URL, sslmode='require')
        conn.autocommit = True
        return conn
    except Exception as e:
        print(f"❌ Database connection error: {e}")
        return None

# ============================================================================
# MEMBER MANAGEMENT
# ============================================================================

@members_bp.route('/', methods=['GET'])
def get_all_members():
    """Get all registered members with tracking status"""
    try:
        print(f"\n{'='*60}")
        print("📋 GET ALL MEMBERS REQUEST")
        print(f"{'='*60}")
        
        conn = get_db()
        if not conn:
            print("❌ Database connection failed")
            return jsonify({
                "success": False,
                "error": "Database connection failed"
            }), 503
        
        print("✅ Database connected")
        cursor = conn.cursor(row_factory=dict_row)
        
        # Get all members - SIMPLE QUERY ONLY
        print("🔍 Querying members table...")
        cursor.execute("""
            SELECT 
                id, email, full_name, employee_id, department, 
                position, status, created_at, updated_at,
                is_active, last_punch_in, last_punch_out
            FROM members
            ORDER BY created_at DESC
        """)
        
        members = cursor.fetchall()
        print(f"✅ Found {len(members)} members")
        
        cursor.close()
        conn.close()
        print("✅ Database closed")
        
        # Convert to JSON-serializable format
        members_list = []
        for member in members:
            member_dict = dict(member)
            
            # Convert datetime objects to ISO strings
            for key in ['created_at', 'updated_at', 'last_punch_in', 'last_punch_out']:
                if member_dict.get(key):
                    member_dict[key] = member_dict[key].isoformat()
            
            # Set tracking to false for now (can add back later)
            member_dict['is_currently_tracking'] = False
            
            members_list.append(member_dict)
        
        print(f"✅ Returning {len(members_list)} members")
        print(f"{'='*60}\n")
        
        return jsonify({
            "success": True,
            "members": members_list,
            "count": len(members_list),
            "active_count": 0,
            "inactive_count": len(members_list)
        }), 200
    
    except Exception as e:
        print(f"❌ Error fetching members: {e}")
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@members_bp.route('/', methods=['POST'])
def add_member():
    """Add a new member"""
    try:
        print(f"\n{'='*60}")
        print("📝 ADD MEMBER REQUEST RECEIVED")
        print(f"{'='*60}")
        
        data = request.json
        print(f"📦 Request data: {data}")
        
        # Validate required fields
        required_fields = ['email', 'full_name']
        for field in required_fields:
            if not data.get(field):
                error_msg = f"Missing required field: {field}"
                print(f"❌ Validation error: {error_msg}")
                return jsonify({
                    "success": False,
                    "error": error_msg
                }), 400
        
        email = data['email'].lower().strip()
        full_name = data['full_name'].strip()
        employee_id = data.get('employee_id', '').strip()
        department = data.get('department', '').strip()
        position = data.get('position', '').strip()
        
        print(f"📧 Email: {email}")
        print(f"👤 Name: {full_name}")
        
        conn = get_db()
        if not conn:
            print("❌ Database connection failed")
            return jsonify({
                "success": False,
                "error": "Database connection failed"
            }), 503
        
        cursor = conn.cursor(row_factory=dict_row)
        
        # Check if email already exists
        print(f"🔍 Checking if email exists: {email}")
        cursor.execute("SELECT id FROM members WHERE email = %s", (email,))
        existing = cursor.fetchone()
        
        if existing:
            print(f"⚠️ Email already exists: {email}")
            cursor.close()
            conn.close()
            return jsonify({
                "success": False,
                "error": "Email already registered"
            }), 409
        
        # Insert new member
        print(f"➕ Inserting new member...")
        cursor.execute("""
            INSERT INTO members (
                email, full_name, employee_id, department, position, 
                status, is_active, created_at
            )
            VALUES (%s, %s, %s, %s, %s, 'active', TRUE, %s)
            RETURNING id, email, full_name, employee_id, department, position, created_at
        """, (email, full_name, employee_id, department, position, datetime.now()))
        
        new_member = cursor.fetchone()
        cursor.close()
        conn.close()
        
        # Convert to dict
        member_dict = dict(new_member)
        if member_dict.get('created_at'):
            member_dict['created_at'] = member_dict['created_at'].isoformat()
        
        print(f"✅ New member added successfully: {email} (ID: {member_dict['id']})")
        print(f"{'='*60}\n")
        
        return jsonify({
            "success": True,
            "message": "Member added successfully",
            "member": member_dict
        }), 201
    
    except Exception as e:
        print(f"❌ Error adding member: {e}")
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@members_bp.route('/<int:member_id>', methods=['PUT'])
def update_member(member_id):
    """Update member details"""
    try:
        data = request.json
        
        conn = get_db()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 503
        
        cursor = conn.cursor(row_factory=dict_row)
        
        # Build update query dynamically
        update_fields = []
        values = []
        
        allowed_fields = ['full_name', 'employee_id', 'department', 'position', 'status']
        for field in allowed_fields:
            if field in data:
                update_fields.append(f"{field} = %s")
                values.append(data[field])
        
        if not update_fields:
            return jsonify({
                "success": False,
                "error": "No valid fields to update"
            }), 400
        
        values.append(member_id)
        
        query = f"""
            UPDATE members 
            SET {', '.join(update_fields)}, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            RETURNING id, email, full_name, employee_id, department, position, status, updated_at
        """
        
        cursor.execute(query, values)
        updated_member = cursor.fetchone()
        
        if not updated_member:
            cursor.close()
            conn.close()
            return jsonify({
                "success": False,
                "error": "Member not found"
            }), 404
        
        cursor.close()
        conn.close()
        
        member_dict = dict(updated_member)
        if member_dict.get('updated_at'):
            member_dict['updated_at'] = member_dict['updated_at'].isoformat()
        
        return jsonify({
            "success": True,
            "message": "Member updated successfully",
            "member": member_dict
        })
    
    except Exception as e:
        print(f"❌ Error updating member: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@members_bp.route('/<int:member_id>', methods=['DELETE'])
def delete_member(member_id):
    """Delete a member"""
    try:
        conn = get_db()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 503
        
        cursor = conn.cursor()
        
        cursor.execute("DELETE FROM members WHERE id = %s RETURNING id", (member_id,))
        deleted = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if not deleted:
            return jsonify({
                "success": False,
                "error": "Member not found"
            }), 404
        
        return jsonify({
            "success": True,
            "message": "Member deleted successfully"
        })
    
    except Exception as e:
        print(f"❌ Error deleting member: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ============================================================================
# PUNCH IN/OUT VERIFICATION
# ============================================================================

@members_bp.route('/verify', methods=['POST'])
def verify_member():
    """Verify member email for punch in"""
    try:
        data = request.json
        email = data.get('email', '').lower().strip()
        
        if not email:
            return jsonify({
                "success": False,
                "error": "Email is required"
            }), 400
        
        conn = get_db()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 503
        
        cursor = conn.cursor(row_factory=dict_row)
        
        cursor.execute("""
            SELECT id, email, full_name, employee_id, department, position, 
                   status, is_active, last_punch_in, last_punch_out
            FROM members
            WHERE email = %s
        """, (email,))
        
        member = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not member:
            return jsonify({
                "success": False,
                "verified": False,
                "error": "Email not found. Please contact administrator to add you as a member."
            }), 404
        
        if not member['is_active'] or member['status'] != 'active':
            return jsonify({
                "success": False,
                "verified": False,
                "error": "Your account is inactive. Please contact administrator."
            }), 403
        
        member_dict = dict(member)
        for key in ['last_punch_in', 'last_punch_out']:
            if member_dict.get(key):
                member_dict[key] = member_dict[key].isoformat()
        
        return jsonify({
            "success": True,
            "verified": True,
            "member": member_dict,
            "message": f"Welcome, {member['full_name']}!"
        })
    
    except Exception as e:
        print(f"❌ Error verifying member: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@members_bp.route('/punch-in', methods=['POST'])
def punch_in():
    """Record punch in time"""
    try:
        data = request.json
        email = data.get('email', '').lower().strip()
        device_id = data.get('device_id', '')
        
        if not email:
            return jsonify({
                "success": False,
                "error": "Email is required"
            }), 400
        
        conn = get_db()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 503
        
        cursor = conn.cursor(row_factory=dict_row)
        
        # Verify member exists and is active
        cursor.execute("""
            SELECT id, email, full_name, is_active, status
            FROM members
            WHERE email = %s
        """, (email,))
        
        member = cursor.fetchone()
        
        if not member or not member['is_active'] or member['status'] != 'active':
            cursor.close()
            conn.close()
            return jsonify({
                "success": False,
                "error": "Member not found or inactive"
            }), 403
        
        # Update last punch in time
        punch_in_time = datetime.now()
        cursor.execute("""
            UPDATE members
            SET last_punch_in = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            RETURNING id, email, full_name, last_punch_in
        """, (punch_in_time, member['id']))
        
        updated_member = cursor.fetchone()
        
        # Record punch in log
        cursor.execute("""
            INSERT INTO punch_logs (member_id, email, action, device_id, timestamp)
            VALUES (%s, %s, 'punch_in', %s, %s)
        """, (member['id'], email, device_id, punch_in_time))
        
        cursor.close()
        conn.close()
        
        result = dict(updated_member)
        if result.get('last_punch_in'):
            result['last_punch_in'] = result['last_punch_in'].isoformat()
        
        print(f"✅ Punch in recorded: {email} at {punch_in_time}")
        
        return jsonify({
            "success": True,
            "message": f"Punched in successfully, {member['full_name']}!",
            "punch_in_time": punch_in_time.isoformat(),
            "member": result
        })
    
    except Exception as e:
        print(f"❌ Error recording punch in: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@members_bp.route('/punch-out', methods=['POST'])
def punch_out():
    """Record punch out time"""
    try:
        data = request.json
        email = data.get('email', '').lower().strip()
        device_id = data.get('device_id', '')
        
        if not email:
            return jsonify({
                "success": False,
                "error": "Email is required"
            }), 400
        
        conn = get_db()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 503
        
        cursor = conn.cursor(row_factory=dict_row)
        
        # Verify member exists
        cursor.execute("""
            SELECT id, email, full_name, last_punch_in
            FROM members
            WHERE email = %s
        """, (email,))
        
        member = cursor.fetchone()
        
        if not member:
            cursor.close()
            conn.close()
            return jsonify({
                "success": False,
                "error": "Member not found"
            }), 404
        
        # Update last punch out time
        punch_out_time = datetime.now()
        cursor.execute("""
            UPDATE members
            SET last_punch_out = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            RETURNING id, email, full_name, last_punch_in, last_punch_out
        """, (punch_out_time, member['id']))
        
        updated_member = cursor.fetchone()
        
        # Calculate duration if punch in exists
        duration_minutes = 0
        if member['last_punch_in']:
            duration = punch_out_time - member['last_punch_in']
            duration_minutes = int(duration.total_seconds() / 60)
        
        # Record punch out log
        cursor.execute("""
            INSERT INTO punch_logs (member_id, email, action, device_id, timestamp, duration_minutes)
            VALUES (%s, %s, 'punch_out', %s, %s, %s)
        """, (member['id'], email, device_id, punch_out_time, duration_minutes))
        
        cursor.close()
        conn.close()
        
        result = dict(updated_member)
        for key in ['last_punch_in', 'last_punch_out']:
            if result.get(key):
                result[key] = result[key].isoformat()
        
        print(f"✅ Punch out recorded: {email} at {punch_out_time} (Duration: {duration_minutes} mins)")
        
        return jsonify({
            "success": True,
            "message": f"Punched out successfully, {member['full_name']}!",
            "punch_out_time": punch_out_time.isoformat(),
            "duration_minutes": duration_minutes,
            "member": result
        })
    
    except Exception as e:
        print(f"❌ Error recording punch out: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@members_bp.route('/punch-logs', methods=['GET'])
def get_punch_logs():
    """Get punch in/out logs"""
    try:
        email = request.args.get('email')
        limit = int(request.args.get('limit', 50))
        
        conn = get_db()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 503
        
        cursor = conn.cursor(row_factory=dict_row)
        
        if email:
            cursor.execute("""
                SELECT * FROM punch_logs
                WHERE email = %s
                ORDER BY timestamp DESC
                LIMIT %s
            """, (email.lower().strip(), limit))
        else:
            cursor.execute("""
                SELECT * FROM punch_logs
                ORDER BY timestamp DESC
                LIMIT %s
            """, (limit,))
        
        logs = cursor.fetchall()
        cursor.close()
        conn.close()
        
        logs_list = []
        for log in logs:
            log_dict = dict(log)
            if log_dict.get('timestamp'):
                log_dict['timestamp'] = log_dict['timestamp'].isoformat()
            logs_list.append(log_dict)
        
        return jsonify({
            "success": True,
            "logs": logs_list,
            "count": len(logs_list)
        })
    
    except Exception as e:
        print(f"❌ Error fetching punch logs: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
