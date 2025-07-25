import CurrencyExchange from "../components/CurrencyExchange";
import TransactionWorkflow from "../components/TransactionWorkflow";
import P2PExchange from "../components/P2PExchange";
import P2PChat from "../components/P2PChat";
import CustomerBanking from "../components/CustomerBanking";
import TenantSettings from "../components/TenantSettings";

const routes = [
  {
    path: "/currency-exchange",
    element: <CurrencyExchange />,
  },
  {
    path: "/transaction-workflow",
    element: <TransactionWorkflow />,
  },
  {
    path: "/p2p-exchange",
    element: <P2PExchange />,
  },
  {
    path: "/p2p-chat",
    element: <P2PChat />,
  },
  {
    path: "/customer-banking",
    element: <CustomerBanking />,
  },
  {
    path: "/tenant-settings",
    element: <TenantSettings />,
  },
];

export default routes;
