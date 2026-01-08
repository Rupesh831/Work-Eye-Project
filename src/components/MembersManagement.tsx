import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Edit2, Trash2, Mail, Check, X, Search, Filter, Save, AlertCircle } from 'lucide-react';
import { fetchAPI } from '../config/api';

const API_BASE = '/api/members';

interface Member {
  id: number;
  email: string;
  full_name: string;
  employee_id: string;
  department: string;
  position: string;
  status: string;
  is_active: boolean;
  last_punch_in: string | null;
  last_punch_out: string | null;
  created_at: string;
  is_currently_tracking?: boolean;
}

export function MembersManagement() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const [formData, setFormData] = useState({
    email: '',
    full_name: ''
  });

  const [editFormData, setEditFormData] = useState<Partial<Member>>({});

  useEffect(() => {
    loadMembers();
    const interval = setInterval(loadMembers, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const data = await fetchAPI(API_BASE);
      
      if (data.success) {
        setMembers(data.members);
      }
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    
    if (!formData.email || !formData.full_name) {
      setErrorMessage('Email and Name are required');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setErrorMessage('Please enter a valid email address');
      return;
    }
    
    try {
      setSubmitting(true);
      
      console.log('📤 Sending request to:', API_BASE);
      console.log('📦 Request body:', formData);
      
      const data = await fetchAPI(API_BASE, {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      
      console.log('📥 Response data:', data);
      
      if (data.success) {
        // Success!
        setShowAddModal(false);
        setFormData({ email: '', full_name: '' });
        setErrorMessage('');
        loadMembers();
        showNotification('✅ Member added successfully!', 'success');
      } else {
        // Error from server
        const errorMsg = data.error || data.message || 'Failed to add member';
        console.error('❌ API Error:', errorMsg);
        setErrorMessage(errorMsg);
      }
    } catch (error: any) {
      console.error('❌ Caught error:', error);
      console.error('❌ Error message:', error.message);
      
      // Parse error message to extract actual error
      let errorMsg = error.message || 'Failed to add member. Please try again.';
      
      // Check if error message contains JSON error response
      if (errorMsg.includes('HTTP 409')) {
        setErrorMessage(`Email "${formData.email}" already exists in the system!`);
      } else if (errorMsg.includes('HTTP 400')) {
        // Try to extract the actual error from the message
        const match = errorMsg.match(/"error":"([^"]+)"/);
        if (match && match[1]) {
          setErrorMessage(match[1]);
        } else {
          setErrorMessage('Invalid request. Please check your input.');
        }
      } else if (errorMsg.includes('HTTP 503')) {
        setErrorMessage('Database connection failed. Please try again in a moment.');
      } else if (errorMsg.includes('Cannot connect')) {
        setErrorMessage('Cannot connect to server. The backend may be sleeping (Render free tier). Please wait 30-60 seconds and try again.');
      } else {
        setErrorMessage(errorMsg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (member: Member) => {
    setEditingId(member.id);
    setEditFormData({
      full_name: member.full_name,
      employee_id: member.employee_id,
      department: member.department,
      position: member.position
    });
  };

  const handleSaveEdit = async (id: number) => {
    try {
      const data = await fetchAPI(`${API_BASE}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(editFormData)
      });
      
      if (data.success) {
        setEditingId(null);
        setEditFormData({});
        loadMembers();
        showNotification('Member updated successfully!', 'success');
      } else {
        alert(data.error || 'Failed to update member');
      }
    } catch (error) {
      console.error('Error updating member:', error);
      alert('Failed to update member');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditFormData({});
  };

  const handleDeleteMember = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) return;
    
    try {
      const data = await fetchAPI(`${API_BASE}/${id}`, {
        method: 'DELETE'
      });
      
      if (data.success) {
        loadMembers();
        showNotification('Member deleted successfully!', 'error');
      } else {
        alert(data.error || 'Failed to delete member');
      }
    } catch (error) {
      console.error('Error deleting member:', error);
      alert('Failed to delete member');
    }
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    const color = type === 'success' ? 'bg-green-500' : 'bg-red-500';
    const div = document.createElement('div');
    div.className = `fixed top-4 right-4 ${color} text-white px-6 py-3 rounded-lg shadow-lg z-[9999] animate-fade-in`;
    div.textContent = message;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
  };

  const totalMembers = members.length;
  const activeMembers = members.filter(m => m.is_currently_tracking).length;
  const inactiveMembers = totalMembers - activeMembers;

  const filteredMembers = members.filter(member => {
    const matchesSearch = 
      member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.employee_id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = 
      filterStatus === 'all' ||
      (filterStatus === 'active' && member.is_currently_tracking) ||
      (filterStatus === 'inactive' && !member.is_currently_tracking);
    
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading members...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl shadow-lg">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Members Management</h2>
            <p className="text-sm text-slate-500">Manage employee access to Work-Eye</p>
          </div>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setShowAddModal(true);
            setErrorMessage('');
            setFormData({ email: '', full_name: '' });
          }}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-shadow"
        >
          <Plus className="w-5 h-5" />
          Add Member
        </motion.button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 bg-white rounded-2xl shadow-sm border border-slate-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">Total Members</p>
              <p className="text-3xl font-bold text-slate-800">{totalMembers}</p>
              <p className="text-xs text-slate-400 mt-1">Registered in system</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 bg-white rounded-2xl shadow-sm border border-slate-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">Active Now</p>
              <p className="text-3xl font-bold text-green-600">{activeMembers}</p>
              <p className="text-xs text-slate-400 mt-1">Currently tracking</p>
            </div>
            <div className="p-3 bg-green-100 rounded-xl">
              <Check className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 bg-white rounded-2xl shadow-sm border border-slate-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">Inactive</p>
              <p className="text-3xl font-bold text-slate-400">{inactiveMembers}</p>
              <p className="text-xs text-slate-400 mt-1">Not tracking</p>
            </div>
            <div className="p-3 bg-slate-100 rounded-xl">
              <X className="w-6 h-6 text-slate-400" />
            </div>
          </div>
        </motion.div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, or employee ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-slate-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          >
            <option value="all">All Members ({totalMembers})</option>
            <option value="active">Active Only ({activeMembers})</option>
            <option value="inactive">Inactive Only ({inactiveMembers})</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Member
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Employee ID
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Position
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <AnimatePresence>
                {filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p className="text-slate-500">No members found</p>
                      <p className="text-sm text-slate-400 mt-1">
                        {searchTerm || filterStatus !== 'all' 
                          ? 'Try adjusting your search or filter'
                          : 'Click "Add Member" to get started'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((member, index) => (
                    <motion.tr
                      key={member.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-md">
                            {member.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            {editingId === member.id ? (
                              <input
                                type="text"
                                value={editFormData.full_name || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                                className="font-medium text-slate-800 border border-blue-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Full Name"
                              />
                            ) : (
                              <p className="font-medium text-slate-800">{member.full_name}</p>
                            )}
                            <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                              <Mail className="w-3 h-3" />
                              {member.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {editingId === member.id ? (
                          <input
                            type="text"
                            value={editFormData.employee_id || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, employee_id: e.target.value })}
                            className="text-sm text-slate-600 border border-blue-300 rounded px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Employee ID"
                          />
                        ) : (
                          <span className="text-sm text-slate-600">{member.employee_id || '-'}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {editingId === member.id ? (
                          <input
                            type="text"
                            value={editFormData.department || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                            className="text-sm text-slate-600 border border-blue-300 rounded px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Department"
                          />
                        ) : (
                          <span className="text-sm text-slate-600">{member.department || '-'}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {editingId === member.id ? (
                          <input
                            type="text"
                            value={editFormData.position || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, position: e.target.value })}
                            className="text-sm text-slate-600 border border-blue-300 rounded px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Position"
                          />
                        ) : (
                          <span className="text-sm text-slate-600">{member.position || '-'}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {member.is_currently_tracking ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
                            <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {editingId === member.id ? (
                            <>
                              <button
                                onClick={() => handleSaveEdit(member.id)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Save changes"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Cancel"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEditClick(member)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit member"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteMember(member.id, member.full_name)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete member"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Member Modal - FIXED Z-INDEX */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]"
            onClick={() => {
              setShowAddModal(false);
              setErrorMessage('');
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative z-[10000]"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-slate-800">Add New Member</h3>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setErrorMessage('');
                  }}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              
              {/* Error Message */}
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3"
                >
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Error</p>
                    <p className="text-sm text-red-600">{errorMessage}</p>
                  </div>
                </motion.div>
              )}
              
              <form onSubmit={handleAddMember} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => {
                        setFormData({ ...formData, email: e.target.value });
                        setErrorMessage('');
                      }}
                      className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="john@company.com"
                      disabled={submitting}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">This will be used for login and tracking</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => {
                      setFormData({ ...formData, full_name: e.target.value });
                      setErrorMessage('');
                    }}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="John Doe"
                    disabled={submitting}
                  />
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <p className="text-sm text-slate-600 mb-4">
                    <span className="font-medium">Note:</span> Employee ID, Department, and Position can be added later using the Edit button.
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddModal(false);
                        setErrorMessage('');
                      }}
                      disabled={submitting}
                      className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-shadow font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Adding...
                        </>
                      ) : (
                        'Add Member'
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
