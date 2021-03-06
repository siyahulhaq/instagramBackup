import { createStackNavigator } from "@react-navigation/stack";
import React from "react";
import { useSelector } from "react-redux";
import Login from "../Components/Login";
import SignUp from "../Components/Login/SignUp";
import UserStory from "../Components/UserStory";
import BottomHomeNavigator from "./BottomHomeNavigator";

const Stack = createStackNavigator();

const Routes = () => {
  const { userInfo } = useSelector((state) => state.userSignIn);

  return (
    <Stack.Navigator>
      {/* home screen */}
      {userInfo ? (
        <>
          <Stack.Screen
            name="Home"
            component={BottomHomeNavigator}
            options={{
              headerShown: false,
            }}
          />
          {/* Story View Screen */}
          <Stack.Screen
            name="UserStory"
            component={UserStory}
            options={{
              headerShown: false,
            }}
          />
        </>
      ) : (
        <>
          <Stack.Screen
            name="Login"
            component={Login}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="SignUp"
            component={SignUp}
            options={{
              headerShown: false,
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
};

export default Routes;
