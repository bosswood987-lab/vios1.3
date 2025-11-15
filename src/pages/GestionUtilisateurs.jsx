
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Users, Edit, UserPlus, Info, Shield, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";

const roleConfig = {
  admin: { label: "Administrateur", color: "bg-red-100 text-red-800", icon: Shield },
  secretaire: { label: "Secrétaire", color: "bg-purple-100 text-purple-800", icon: Users },
  orthoptiste: { label: "Orthoptiste", color: "bg-blue-100 text-blue-800", icon: Users },
  ophtalmologue: { label: "Ophtalmologue", color: "bg-green-100 text-green-800", icon: Users },
};

export default function GestionUtilisateurs() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showInviteInfo, setShowInviteInfo] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const [formData, setFormData] = useState({
    full_name: "",
    specialite: ""
  });

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me().catch(() => null);
        setCurrentUser(user || { specialite: 'admin', id: 'default' });
      } finally {
        setIsLoading(false);
      }
    };
    loadUser();
  }, [navigate]);

  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
    enabled: !!currentUser && currentUser.specialite === 'admin',
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, userData }) => {
      return base44.entities.User.update(userId, userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowEditDialog(false);
      setEditingUser(null);
      setFormData({ full_name: "", specialite: "" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId) => base44.entities.User.delete(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowDeleteDialog(false);
      setUserToDelete(null);
    },
  });

  const handleEditUser = (user) => {
    setEditingUser(user);
    setFormData({
      full_name: user.full_name || "",
      specialite: user.specialite || "secretaire"
    });
    setShowEditDialog(true);
  };

  const handleSaveUser = async () => {
    if (!editingUser || !formData.full_name || !formData.specialite) {
      return;
    }
    
    await updateUserMutation.mutateAsync({
      userId: editingUser.id,
      userData: {
        full_name: formData.full_name,
        specialite: formData.specialite
      }
    });
  };

  const handleDeleteUser = (user) => {
    setUserToDelete(user);
    setShowDeleteDialog(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    await deleteUserMutation.mutateAsync(userToDelete.id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!currentUser || currentUser.specialite !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen p-8">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Accès refusé</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Seuls les administrateurs peuvent accéder à cette page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">Gestion des utilisateurs</h1>
              <Badge className="bg-red-100 text-red-800">
                <Shield className="w-3 h-3 mr-1" />
                Administrateur uniquement
              </Badge>
            </div>
            <p className="text-gray-500">Gérer les rôles et permissions</p>
          </div>
          <Button
            onClick={() => setShowInviteInfo(true)}
            className="bg-blue-600 hover:bg-blue-700 gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Inviter un utilisateur
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loadingUsers ? (
            <div className="col-span-3 text-center py-8 text-gray-500">
              Chargement des utilisateurs...
            </div>
          ) : users.length === 0 ? (
            <div className="col-span-3 text-center py-8 text-gray-500">
              Aucun utilisateur trouvé
            </div>
          ) : (
            users.map((user) => {
              const config = roleConfig[user.specialite] || { 
                label: user.specialite || "Non défini", 
                color: "bg-gray-100 text-gray-800",
                icon: Users
              };
              const Icon = config.icon;
              const isCurrentUser = user.id === currentUser.id;

              return (
                <Card key={user.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-lg">
                            {user.full_name?.charAt(0) || 'U'}
                          </span>
                        </div>
                        <div>
                          <CardTitle className="text-base">
                            {user.full_name || 'Utilisateur'}
                            {isCurrentUser && (
                              <Badge className="ml-2 bg-blue-100 text-blue-800 text-xs">
                                Vous
                              </Badge>
                            )}
                          </CardTitle>
                          <p className="text-xs text-gray-500 mt-1">{user.email}</p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge className={`${config.color} flex items-center gap-1`}>
                        <Icon className="w-3 h-3" />
                        {config.label}
                      </Badge>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                          className="gap-1"
                        >
                          <Edit className="w-3 h-3" />
                          Modifier
                        </Button>
                        {!isCurrentUser && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUser(user)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      Créé le {new Date(user.created_date).toLocaleDateString('fr-FR')}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifier l'utilisateur</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nom complet *</Label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Dr. Prénom Nom"
                />
              </div>
              <div>
                <Label>Email</Label>
                <div className="text-sm text-gray-600 mt-1 p-2 bg-gray-50 rounded">
                  {editingUser?.email}
                </div>
              </div>
              <div>
                <Label>Rôle / Spécialité *</Label>
                <Select
                  value={formData.specialite}
                  onValueChange={(value) => setFormData({ ...formData, specialite: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-red-600" />
                        Administrateur
                      </div>
                    </SelectItem>
                    <SelectItem value="secretaire">Secrétaire</SelectItem>
                    <SelectItem value="orthoptiste">Orthoptiste</SelectItem>
                    <SelectItem value="ophtalmologue">Ophtalmologue</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-2">
                  Les administrateurs ont accès à toutes les fonctionnalités de gestion
                </p>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  Annuler
                </Button>
                <Button 
                  onClick={handleSaveUser} 
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={!formData.full_name || !formData.specialite || updateUserMutation.isPending}
                >
                  {updateUserMutation.isPending ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-red-600">Supprimer l'utilisateur</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Alert className="bg-red-50 border-red-200">
                <Trash2 className="h-4 w-4 text-red-600" />
                <AlertDescription className="ml-2">
                  <strong>Attention !</strong> Cette action est irréversible.
                </AlertDescription>
              </Alert>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-700 mb-2">
                  Vous êtes sur le point de supprimer :
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">
                      {userToDelete?.full_name?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold">{userToDelete?.full_name || 'Utilisateur'}</p>
                    <p className="text-xs text-gray-500">{userToDelete?.email}</p>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-700">
                Cet utilisateur perdra immédiatement l'accès à l'application et toutes ses données associées seront conservées mais il ne pourra plus se connecter.
              </p>

              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                  Annuler
                </Button>
                <Button 
                  onClick={confirmDeleteUser}
                  className="bg-red-600 hover:bg-red-700"
                  disabled={deleteUserMutation.isPending}
                >
                  {deleteUserMutation.isPending ? "Suppression..." : "Supprimer définitivement"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showInviteInfo} onOpenChange={setShowInviteInfo}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-600" />
                Inviter un nouvel utilisateur
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-gray-700 mb-3">
                  Pour inviter un nouvel utilisateur à rejoindre votre cabinet :
                </p>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                  <li>Accédez au <strong>Dashboard Base44</strong></li>
                  <li>Cliquez sur <strong>"Invite User"</strong></li>
                  <li>Entrez l'email du nouvel utilisateur</li>
                  <li>Il recevra un email d'invitation</li>
                  <li>Une fois connecté, vous pourrez lui attribuer un rôle ici</li>
                </ol>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setShowInviteInfo(false)}>
                  Compris
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
