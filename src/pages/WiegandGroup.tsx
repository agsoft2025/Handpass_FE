import { useState, type ReactNode } from "react";
import { Box, Tab, Tabs } from "@mui/material";
import AssignRemoteTimeGroupTab from "../components/remotegroup/AssignRemoteTimeGroupTab";
import RemoteGroupTab from "../components/remotegroup/RemoteGroupTab";
import TimeGroupTab from "../components/remotegroup/TimeGroupTab";

function TabPanel(props: { children?: ReactNode; value: number; index: number }) {
  const { children, value, index } = props;
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

const WiegandGroup = () => {
  const [tabValue, setTabValue] = useState(0);

  return (
    <Box className="p-4">
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 1 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="Remote Group" className="text-primary! font-extrabold!" />
          <Tab label="Time Group" className="text-primary! font-extrabold!" />
          <Tab label="Assign Remote/Time Group" className="text-primary! font-extrabold!" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <RemoteGroupTab />
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <TimeGroupTab />
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <AssignRemoteTimeGroupTab />
      </TabPanel>
    </Box>
  );
};

export default WiegandGroup;

