import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Card,
  CardMedia,
  IconButton
} from "@mui/material";
import { IoIosCloseCircle } from "react-icons/io";
import { useSingleUser } from "../../service/useUsers";

interface UserDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  userId: string;
}

const UserDetailsDialog: React.FC<UserDetailsDialogProps> = ({ open, onClose, userId }) => {
  const { data, isLoading } = useSingleUser(userId);
  const user = data?.data;

  const normalizeBase64 = (img: string) => {
  if (!img) return "";
  return img.startsWith("data:image") ? img : `data:image/png;base64,${img}`;
};

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle className="flex justify-between items-center">
       <span className="text-primary font-bold">User Details</span>
        <IconButton onClick={onClose}>
          <IoIosCloseCircle color="red" />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {isLoading && <Typography>Loading...</Typography>}

        {!isLoading && user && (
          <div className="space-y-4">
            {/* Text Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 bg-secondary p-4">
                <p><strong>Name:</strong> {user.name}</p>
                <p><strong>Email:</strong> {user.email ?? "N/A"}</p>
                <p><strong>Role:</strong> {user.role}</p>
                <p><strong>SN:</strong> {user.sn ?? "N/A"}</p>
                <p><strong>Wiegand Flag:</strong> {user.wiegand_flag}</p>
                <p><strong>Admin Auth:</strong> {user.admin_auth}</p>
                <p><strong>Created:</strong> {new Date(user.created_at).toLocaleString()}</p>
                <p><strong>Updated:</strong> {new Date(user.updated_at).toLocaleString()}</p>
              </div>

              {/* Images */}
              <div className="grid grid-cols-2 gap-4">
                {user.image_left && (
                  <Card className="shadow-md">
                    <CardMedia
                      component="img"
                      image={normalizeBase64(user.image_left)}
                      alt="Left"
                      height={200}
                    />
                  </Card>
                )}
                {user.image_right && (
                  <Card className="shadow-md">
                    <CardMedia
                      component="img"
                      image={normalizeBase64(user.image_right)}
                      alt="Right"
                      height={200}
                    />
                  </Card>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UserDetailsDialog;
