import { Box, ChakraProvider, Flex, Text, Input } from "@chakra-ui/react";
import { isNil } from "ramda";
import { useEffect, useState, useRef } from "react";
import { ethers } from "ethers";
import lf from "localforage";
import SDK from "weavedb-sdk";

let db;
const contractTxId = "_ApoA69a_9i39YT_LqQM59_pr8nHo7GZwKZLTaK8Wk8";
const COLLECTION_NAME = "messages_post";

export default function Home() {
  const [user, setUser] = useState(null);
  const [initDB, setInitDB] = useState(false);
  const [messages, setMessages] = useState([]);
  let message = useRef();

  const setupWeaveDB = async () => {
    db = new SDK({
      contractTxId,
    });
    await db.initializeWithoutWallet();
    setInitDB(true);
  };

  const checkUser = async () => {
    const wallet_address = await lf.getItem(`temp_address:current`);
    if (!isNil(wallet_address)) {
      const identity = await lf.getItem(
        `temp_address:${contractTxId}:${wallet_address}`
      );
      if (!isNil(identity))
        setUser({
          wallet: wallet_address,
          privateKey: identity.privateKey,
        });
    }
  };

  const login = async () => {
    const provider = new ethers.BrowserProvider(window.ethereum, "any");
    const signer = await provider.getSigner();
    await provider.send("eth_requestAccounts", []);
    const wallet_address = await signer.getAddress();
    let identity = await lf.getItem(
      `temp_address:${contractTxId}:${wallet_address}`
    );
    let tx;
    let err;
    if (isNil(identity)) {
      ({ tx, identity, err } = await db.createTempAddress(wallet_address));
      const linked = await db.getAddressLink(identity.address);
      if (isNil(linked)) {
        alert("something went wrong");
        return;
      }
    } else {
      await lf.setItem("temp_address:current", wallet_address);

      setUser({
        wallet: wallet_address,
        privateKey: identity.privateKey,
      });
      return;
    }
    if (!isNil(tx) && isNil(tx.err)) {
      identity.tx = tx;
      identity.linked_address = wallet_address;
      await lf.setItem("temp_address:current", wallet_address);
      await lf.setItem(
        `temp_address:${contractTxId}:${wallet_address}`,
        identity
      );
      setUser({
        wallet: wallet_address,
        privateKey: identity.privateKey,
      });
    }
  };

  const logout = async () => {
    if (confirm("Would you like to sign out?")) {
      await lf.removeItem("temp_address:current");
      setUser(null, "temp_current");
    }
  };

  const NavBar = () => {
    return (
      <Flex p={3} position="fixed" w="100%" sx={{ top: 0, left: 0 }}>
        <Box flex={1} />
        <Flex
          bg="#111"
          color="white"
          py={2}
          px={6}
          sx={{
            borderRadius: "5px",
            cursor: "pointer",
            ":hover": { opacity: 0.75 },
          }}
        >
          {!isNil(user) ? (
            <Box onClick={() => logout()}>{user.wallet.slice(0, 7)}</Box>
          ) : (
            <Box onClick={() => login()}>Connect Wallet</Box>
          )}
        </Flex>
      </Flex>
    );
  };

  const Card = (props) => {
    const { btnText, btnClick } = props;

    return (
      <Box
        maxW="sm"
        borderWidth="1px"
        borderRadius="lg"
        overflow="hidden"
        p="4"
        boxShadow="md"
        background="linear-gradient(to bottom, #ff0080, #7928ca)"
      >
        <Flex
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
        >
          <Box w="100%" minW="200px" onClick={btnClick}>
            <Text
              fontSize="5xl"
              fontWeight="bold"
              textAlign="center"
              color="white"
              textShadow="2px 2px 4px rgba(0, 0, 0, 0.3)"
              fontFamily="monospace"
            >
              {btnText}
            </Text>
          </Box>
        </Flex>
      </Box>
    );
  };

  const CardsRow = () => {
    return (
      <Flex justifyContent="space-between">
        <Card btnText="WAGMI" btnClick={onWagmiClick} />
        <Card btnText="NGMI" btnClick={onNgmiClick} />
      </Flex>
    );
  };

  const onWagmiClick = () => {
    addMessage(true);
  };

  const onNgmiClick = () => {
    addMessage(false);
  };

  const NewMessage = () => (
    <Flex mb={4}>
      <Input
        placeholder="Add your message"
        value={message.current}
        onChange={(e) => {
          message.current = e.target.value;
        }}
        sx={{ borderRadius: "5px 0 0 5px" }}
      />
    </Flex>
  );

  const addMessage = async (isWagmi) => {
    console.log("addMessageWagmi()");

    try {
      await db.add(
        {
          message: message.current,
          date: db.ts(),
          user_address: db.signer(),
          wagmi: isWagmi,
        },
        COLLECTION_NAME,
        user
      );
      await getMessages();
    } catch (e) {
      console.log(e);
    }
  };

  const getMessages = async () => {
    setMessages(await db.cget(COLLECTION_NAME, ["date", "desc"]));
  };

  useEffect(() => {
    checkUser();
    setupWeaveDB();
  }, []);

  useEffect(() => {
    if (initDB) {
    }
  }, [initDB]);

  return (
    <ChakraProvider>
      <NavBar />
      <Flex mt="60px" justify="center" p={3}>
        <Box w="100%" maxW="600px">
          <CardsRow />
          {!isNil(user) ? <NewMessage /> : null}
        </Box>
      </Flex>
    </ChakraProvider>
  );
}
