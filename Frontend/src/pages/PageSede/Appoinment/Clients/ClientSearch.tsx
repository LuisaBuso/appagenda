// components/Quotes/ClientSearch.tsx
import React, { useState, useEffect } from 'react';
import { Search, Plus, User, X } from 'lucide-react';
import { getClientesPorSede, crearCliente, buscarClientesPorSede, Cliente, CrearClienteRequest } from '../../../../components/Quotes/clientsService';
import { useAuth } from '../../../../components/Auth/AuthContext';

interface ClientSearchProps {
  sedeId: string;
  selectedClient: Cliente | null;
  onClientSelect: (cliente: Cliente) => void;
  onClientClear: () => void;
  required?: boolean;
}

interface NewClientForm extends CrearClienteRequest {
  nombre: string;
  correo?: string;
  telefono?: string;
  cedula?: string;
  ciudad?: string;
  fecha_de_nacimiento?: string;
  notas?: string;
}

export const ClientSearch: React.FC<ClientSearchProps> = ({
  sedeId,
  selectedClient,
  onClientSelect,
  onClientClear,
  required = true
}) => {
  const { user } = useAuth();
  const [clientSearch, setClientSearch] = useState('');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [showClientModal, setShowClientModal] = useState(false);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [creatingClient, setCreatingClient] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newClient, setNewClient] = useState<NewClientForm>({
    nombre: '',
    correo: '',
    telefono: '',
    cedula: '',
    ciudad: '',
    fecha_de_nacimiento: '',
    sede_id: sedeId,
    notas: ''
  });

  // 🔥 CARGAR CLIENTES DE LA SEDE AL INICIAR
  useEffect(() => {
    const cargarClientesIniciales = async () => {
      if (!user?.access_token || !sedeId) {
        setClientes([]);
        return;
      }
      
      setLoadingClientes(true);
      try {
        console.log('🔄 Cargando clientes iniciales para sede:', sedeId);
        const clientesData = await getClientesPorSede(user.access_token, sedeId);
        console.log('📋 Clientes cargados:', clientesData.length);
        setClientes(clientesData);
      } catch (error) {
        console.error('❌ Error cargando clientes iniciales:', error);
        setClientes([]);
      } finally {
        setLoadingClientes(false);
      }
    };
    
    cargarClientesIniciales();
  }, [sedeId, user?.access_token]);

  // 🔥 BUSCAR CLIENTES CUANDO ESCRIBE
  useEffect(() => {
    const buscarClientesEnTiempoReal = async () => {
      if (!user?.access_token || !sedeId) {
        setClientes([]);
        return;
      }
      
      try {
        if (!clientSearch.trim()) {
          // Cuando no hay búsqueda, cargamos todos los clientes de la sede
          console.log('🔄 Cargando todos los clientes de la sede');
          const clientesSede = await getClientesPorSede(user.access_token, sedeId);
          setClientes(clientesSede);
        } else {
          // Cuando hay búsqueda, usamos la función corregida
          console.log('🔍 Buscando clientes:', clientSearch);
          const clientesEncontrados = await buscarClientesPorSede(user.access_token, sedeId, clientSearch);
          setClientes(clientesEncontrados);
        }
      } catch (error) {
        console.error('❌ Error buscando clientes:', error);
        setClientes([]);
      }
    };
    
    const timeoutId = setTimeout(buscarClientesEnTiempoReal, 300);
    return () => clearTimeout(timeoutId);
  }, [clientSearch, user?.access_token, sedeId]);

  // 🔥 FUNCIÓN PARA CREAR NUEVO CLIENTE
  const handleCreateClient = async () => {
    if (!newClient.nombre.trim()) {
      setError('El nombre del cliente es requerido');
      return;
    }
    
    if (!user?.access_token) {
      setError('No hay sesión activa');
      return;
    }
    
    setCreatingClient(true);
    setError(null);
    
    try {
      console.log('🔄 Creando nuevo cliente:', newClient);
      const result = await crearCliente(user.access_token, {
        ...newClient,
        sede_id: sedeId
      });
      
      if (result.success) {
        console.log('✅ Cliente creado:', result.cliente);
        
        // 🔥 ACTUALIZAMOS LA LISTA DE CLIENTES
        const clientesActualizados = await getClientesPorSede(user.access_token, sedeId);
        setClientes(clientesActualizados);
        
        onClientSelect(result.cliente);
        setClientSearch(result.cliente.nombre);
        setShowClientModal(false);
        setNewClient({
          nombre: '',
          correo: '',
          telefono: '',
          cedula: '',
          ciudad: '',
          fecha_de_nacimiento: '',
          sede_id: sedeId,
          notas: ''
        });
      }
    } catch (error: any) {
      console.error('❌ Error creando cliente:', error);
      setError(error.message || "Error al crear cliente");
    } finally {
      setCreatingClient(false);
    }
  };

  // 🔥 FUNCIÓN PARA SELECCIONAR CLIENTE
  const handleSelectClient = (cliente: Cliente) => {
    onClientSelect(cliente);
    setClientSearch(cliente.nombre);
  };

  // 🔥 FUNCIÓN PARA LIMPIAR CLIENTE SELECCIONADO
  const handleClearClient = () => {
    onClientClear();
    setClientSearch('');
  };

  // 🔥 FORMATEAR FECHA PARA INPUT DATE
  const formatDateForInput = (dateString?: string) => {
    if (!dateString) return '';
    return dateString.split('T')[0];
  };

  return (
    <>
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-3">
          Cliente {required && '*'}
        </label>
        
        {/* CLIENTE SELECCIONADO */}
        {selectedClient ? (
          <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="font-semibold text-green-900">{selectedClient.nombre}</div>
                <div className="text-sm text-green-700">
                  {selectedClient.telefono && `📞 ${selectedClient.telefono}`}
                  {selectedClient.correo && ` • 📧 ${selectedClient.correo}`}
                  {selectedClient.cedula && ` • 🆔 ${selectedClient.cedula}`}
                </div>
              </div>
            </div>
            <button 
              onClick={handleClearClient}
              className="text-green-600 hover:text-green-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          /* BÚSQUEDA DE CLIENTE */
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar cliente por nombre, teléfono, cédula o email..." 
              value={clientSearch} 
              onChange={(e) => setClientSearch(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-12 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
            <button 
              onClick={() => setShowClientModal(true)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
            
            {/* LISTA DE CLIENTES SUGERIDOS */}
            {clientSearch && clientes.length > 0 && (
              <div className="absolute z-20 w-full mt-2 bg-white border border-gray-200 rounded-2xl shadow-2xl max-h-64 overflow-y-auto">
                {clientes.map(cliente => (
                  <button 
                    key={cliente.cliente_id}
                    onClick={() => handleSelectClient(cliente)}
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-all border-b border-gray-100 last:border-b-0 flex items-center gap-3"
                  >
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{cliente.nombre}</div>
                      <div className="text-sm text-gray-600">
                        {cliente.telefono && `📞 ${cliente.telefono}`}
                        {cliente.correo && ` • 📧 ${cliente.correo}`}
                        {cliente.cedula && ` • 🆔 ${cliente.cedula}`}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            
            {/* MENSAJES DE ESTADO */}
            {loadingClientes && (
              <div className="mt-2 text-xs text-blue-600">
                🔄 Buscando clientes...
              </div>
            )}
            {clientSearch && clientes.length === 0 && !loadingClientes && (
              <div className="mt-2 text-xs text-gray-600">
                No se encontraron clientes. Haz clic en el botón "+" para agregar uno nuevo.
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL PARA CREAR NUEVO CLIENTE */}
      {showClientModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Nuevo Cliente</h3>
              <p className="text-sm text-gray-600 mt-1">Completa los datos del nuevo cliente</p>
            </div>
            
            <div className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre completo *
                  </label>
                  <input
                    type="text"
                    value={newClient.nombre}
                    onChange={(e) => setNewClient({...newClient, nombre: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Ej: María González"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cédula
                  </label>
                  <input
                    type="text"
                    value={newClient.cedula}
                    onChange={(e) => setNewClient({...newClient, cedula: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Ej: 123456789"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={newClient.telefono}
                    onChange={(e) => setNewClient({...newClient, telefono: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Ej: 3001234567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newClient.correo}
                    onChange={(e) => setNewClient({...newClient, correo: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Ej: cliente@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ciudad
                  </label>
                  <input
                    type="text"
                    value={newClient.ciudad}
                    onChange={(e) => setNewClient({...newClient, ciudad: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Ej: Bogotá"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de nacimiento
                  </label>
                  <input
                    type="date"
                    value={formatDateForInput(newClient.fecha_de_nacimiento)}
                    onChange={(e) => setNewClient({...newClient, fecha_de_nacimiento: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notas (opcional)
                </label>
                <textarea
                  value={newClient.notas}
                  onChange={(e) => setNewClient({...newClient, notas: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                  rows={3}
                  placeholder="Información adicional del cliente..."
                />
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setShowClientModal(false)}
                disabled={creatingClient}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateClient}
                disabled={!newClient.nombre.trim() || creatingClient}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {creatingClient ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Creando...
                  </>
                ) : (
                  'Crear Cliente'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay para cerrar modal */}
      {showClientModal && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => {
            if (!creatingClient) setShowClientModal(false);
          }} 
        />
      )}
    </>
  );
};