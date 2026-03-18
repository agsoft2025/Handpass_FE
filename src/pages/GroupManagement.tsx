import * as React from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import GroupManagementTable from '../components/groupmanagement/GroupManagementTable';
import GroupRelatedUsers from '../components/groupmanagement/GroupRelatedUsers';

// TabPanel Component
function CustomTabPanel(props: { children?: React.ReactNode; value: number; index: number }) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

// Accessibility props
function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

export default function BasicTabs() {
  const [value, setValue] = React.useState(0);

  const handleChange = (_: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleChange} aria-label="basic tabs example">
          <Tab label="Device Management" className='text-primary! font-extrabold!' {...a11yProps(0)} />
          <Tab label="Group Management Users" className='text-primary! font-extrabold!' {...a11yProps(1)} />
        </Tabs>
      </Box>

      {/* Tab panels */}
      <CustomTabPanel value={value} index={0}>
        {/* Replace with Dashboard Component */}
        <div>
          <GroupManagementTable />
        </div>
      </CustomTabPanel>

      <CustomTabPanel value={value} index={1}>
        {/* Render your GroupManagement component */}
        <GroupRelatedUsers />
      </CustomTabPanel>
    </Box>
  );
}
