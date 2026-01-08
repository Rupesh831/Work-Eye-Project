"""
APP.PY - Complete Backend with Analytics (PostgreSQL VERSION)
Runs Main Processor + Dashboard API + Analytics API together

Backend: https://backend-35m2.onrender.com
Frontend: https://frontend-8x7e.onrender.com
"""
from flask import Flask, jsonify, request, make_response
from datetime import datetime
import os
import sys
import traceback

# Create Flask app
app = Flask(__name__)

# CORS Handler - Add headers to EVERY response
@app.after_request
def add_cors_headers(response):
    """Add CORS headers to every single response"""
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, Accept'
    response.headers['Access-Control-Expose-Headers'] = '*'
    response.headers['Access-Control-Max-Age'] = '3600'
    print(f"✅ CORS headers added to {request.method} {request.path} -> {response.status_code}")
    return response

@app.before_request
def handle_options():
    """Handle OPTIONS requests for CORS preflight"""
    if request.method == 'OPTIONS':
        response = app.make_response(('', 204))
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, Accept'
        response.headers['Access-Control-Expose-Headers'] = '*'
        response.headers['Access-Control-Max-Age'] = '3600'
        print(f"✅ OPTIONS preflight handled for: {request.path}")
        return response
    print(f"📥 Incoming: {request.method} {request.path}")

print("\n" + "="*70)
print("🚀 LOADING BACKEND MODULES (WITH ANALYTICS)")
print("="*70)

# Import and expose main processor functions
main_module = None
try:
    import main as main_module
    print("✅ Main processor module loaded")
except Exception as e:
    print(f"❌ Failed to load main processor: {e}")
    traceback.print_exc()

# Import dashboard API blueprint
dashboard_bp = None
try:
    from dashboardapi import dashboard_bp
    print("✅ Dashboard API module loaded")
except Exception as e:
    print(f"❌ Failed to load dashboard API: {e}")
    traceback.print_exc()

# Import analytics API blueprint
analytics_bp = None
try:
    from analytics_api import analytics_bp
    print("✅ Analytics API module loaded")
except Exception as e:
    print(f"❌ Failed to load analytics API: {e}")
    traceback.print_exc()

# Import members API blueprint
members_bp = None
try:
    from members_api import members_bp
    print("✅ Members API module loaded")
except Exception as e:
    print(f"❌ Failed to load members API: {e}")
    traceback.print_exc()

print("="*70 + "\n")

# ============================================================================
# MAIN PROCESSOR ROUTES (from main.py)
# ============================================================================

@app.route('/')
def home():
    """Combined health check"""
    if main_module:
        try:
            return main_module.home()
        except Exception as e:
            print(f"❌ Error in main.home(): {e}")
            traceback.print_exc()
    
    return jsonify({
        "status": "online",
        "service": "Complete Backend with Analytics - PostgreSQL",
        "main_loaded": main_module is not None,
        "dashboard_loaded": dashboard_bp is not None,
        "analytics_loaded": analytics_bp is not None,
        "members_loaded": members_bp is not None,
        "timestamp": datetime.now().isoformat()
    })


@app.route('/api/health')
def health():
    """Comprehensive health check endpoint"""
    try:
        db_status = False
        if main_module and hasattr(main_module, 'check_db_connection'):
            db_status = main_module.check_db_connection()
        
        return jsonify({
            'status': 'online',
            'database': 'connected' if db_status else 'disconnected',
            'main_module': main_module is not None,
            'dashboard_module': dashboard_bp is not None,
            'analytics_module': analytics_bp is not None,
            'members_module': members_bp is not None,
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        print(f"❌ Error in health check: {e}")
        traceback.print_exc()
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500


@app.route('/api/debug/routes')
def debug_routes():
    """Debug endpoint to show all registered routes"""
    routes = []
    for rule in app.url_map.iter_rules():
        routes.append({
            'endpoint': rule.endpoint,
            'methods': list(rule.methods),
            'path': str(rule.rule)
        })
    return jsonify({
        'success': True,
        'total_routes': len(routes),
        'routes': sorted(routes, key=lambda x: x['path']),
        'members_loaded': members_bp is not None
    })


@app.route('/api/test')
def test():
    """Test endpoint"""
    if main_module:
        try:
            return main_module.test()
        except Exception as e:
            print(f"❌ Error in main.test(): {e}")
            traceback.print_exc()
    
    return jsonify({
        "success": True,
        "message": "Backend is running (main module not loaded)",
        "main_loaded": main_module is not None,
        "analytics_loaded": analytics_bp is not None
    })


@app.route('/api/test-members', methods=['GET', 'POST', 'OPTIONS'])
def test_members():
    """Test members endpoint - bypasses blueprint for debugging"""
    if request.method == 'OPTIONS':
        return '', 204
    
    if request.method == 'POST':
        data = request.get_json()
        return jsonify({
            "success": True,
            "message": "Direct app.py endpoint works!",
            "method": "POST",
            "received_data": data,
            "cors_test": "If you see this, CORS is working!"
        })
    
    return jsonify({
        "success": True,
        "message": "Direct app.py endpoint works!",
        "method": "GET",
        "cors_test": "If you see this, CORS is working!"
    })


@app.route('/api/register-device', methods=['POST'])
def register_device():
    """Register device endpoint"""
    if not main_module:
        return jsonify({
            "status": "error",
            "message": "Main processor not loaded"
        }), 503
    
    try:
        return main_module.register_device()
    except Exception as e:
        print(f"❌ Error in register_device: {e}")
        traceback.print_exc()
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


@app.route('/api/upload-activity', methods=['POST'])
def upload_activity():
    """Upload activity endpoint"""
    if not main_module:
        return jsonify({
            "success": False,
            "error": "Main processor not loaded"
        }), 503
    
    try:
        return main_module.upload_activity()
    except Exception as e:
        print(f"❌ Error in upload_activity: {e}")
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# ============================================================================
# REGISTER BLUEPRINTS
# ============================================================================

# Register Dashboard API Blueprint
if dashboard_bp:
    try:
        app.register_blueprint(dashboard_bp)
        print("✅ Dashboard API blueprint registered at /api/*")
        print("   Routes available:")
        print("   - GET  /api/employees")
        print("   - GET  /api/employee/<device_id>")
        print("   - GET  /api/stats")
        print("   - GET  /api/activity")
        print("   - GET  /api/activity-log")
        print("   - GET  /api/screenshots/<device_id>")
        print("   - POST /api/device/heartbeat")
    except Exception as e:
        print(f"❌ Failed to register dashboard blueprint: {e}")
        traceback.print_exc()
else:
    print("⚠️ Dashboard API blueprint not available")

# Register Analytics API Blueprint
if analytics_bp:
    try:
        app.register_blueprint(analytics_bp)
        print("✅ Analytics API blueprint registered at /api/analytics/*")
        print("   NEW Analytics Routes:")
        print("   - GET  /api/analytics/app-usage/<device_id>")
        print("   - GET  /api/analytics/historical/<device_id>")
        print("   - GET  /api/analytics/productivity-trends/<device_id>")
        print("   - GET  /api/analytics/daily-summary/<device_id>")
        print("   - GET  /api/analytics/export-data/<device_id>")
    except Exception as e:
        print(f"❌ Failed to register analytics blueprint: {e}")
        traceback.print_exc()
else:
    print("⚠️ Analytics API blueprint not available")

# Register Members API Blueprint
if members_bp:
    try:
        app.register_blueprint(members_bp)
        print("✅ Members API blueprint registered at /api/members/*")
        print("   NEW Members Routes:")
        print("   - GET  /api/members/")
        print("   - POST /api/members/")
        print("   - PUT  /api/members/<id>")
        print("   - DEL  /api/members/<id>")
        print("   - POST /api/members/verify")
        print("   - POST /api/members/punch-in")
        print("   - POST /api/members/punch-out")
        print("   - GET  /api/members/punch-logs")
    except Exception as e:
        print(f"❌ Failed to register members blueprint: {e}")
        traceback.print_exc()
else:
    print("⚠️ Members API blueprint not available")


# ============================================================================
# ERROR HANDLERS
# ============================================================================

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'error': 'Endpoint not found',
        'path': str(error)
    }), 404


@app.errorhandler(500)
def internal_error(error):
    print(f"❌ Internal server error: {error}")
    traceback.print_exc()
    return jsonify({
        'success': False,
        'error': 'Internal server error'
    }), 500


# ============================================================================
# STARTUP
# ============================================================================

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    
    print("\n" + "="*70)
    print("🚀 COMPLETE BACKEND STARTING (PostgreSQL + Analytics + Members)")
    print("="*70)
    print(f"📊 Port: {port}")
    print(f"🔥 Main Processor: {'LOADED' if main_module else 'NOT LOADED'}")
    print(f"📈 Dashboard API: {'LOADED' if dashboard_bp else 'NOT LOADED'}")
    print(f"📊 Analytics API: {'LOADED' if analytics_bp else 'NOT LOADED'}")
    print(f"👥 Members API: {'LOADED' if members_bp else 'NOT LOADED'}")
    print(f"🌐 Frontend: https://frontend-8x7e.onrender.com")
    print(f"🔗 Backend: https://backend-35m2.onrender.com")
    print("="*70 + "\n")
    
    app.run(host='0.0.0.0', port=port, debug=False)
