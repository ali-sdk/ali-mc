import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONObject;
import net.spy.memcached.AddrUtil;
import net.spy.memcached.ConnectionFactoryBuilder;
import net.spy.memcached.MemcachedClient;
import net.spy.memcached.auth.AuthDescriptor;
import net.spy.memcached.auth.PlainCallbackHandler;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileReader;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URL;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import net.spy.memcached.ConnectionFactoryBuilder.Protocol;

/**
 * Created by yaotang on 16/2/24.
 */
public class MCTestMain {

  public static void main(String[] args) throws IOException {

    String path = MCTestMain.class.getClassLoader().getResource("").getPath();
    path = path.replace("alisdk-mc/target/classes/", "fixtures/config.json");

    File file = new File(path);
    FileInputStream fis = new FileInputStream(file);
    byte[] data = new byte[(int) file.length()];
    fis.read(data);
    fis.close();

    String jsonString = new String(data);

    System.out.println(jsonString);

    JSONObject jo = (JSONObject) JSONObject.parse(jsonString);

    String host = jo.getString("host");
    String username = jo.getString("username");
    String password = jo.getString("password");
    int port = jo.getInteger("port");
    int timeout = 3000;

    MemcachedClient cache = null;
    AuthDescriptor ad = new AuthDescriptor(new String[] { "PLAIN" },
      new PlainCallbackHandler(username, password));
      cache = new MemcachedClient(new ConnectionFactoryBuilder()
        .setProtocol(Protocol.BINARY).setOpTimeout(timeout).setAuthDescriptor(ad).build(),
        AddrUtil.getAddresses(host + ":" + port));

    cache.set("key1", 0, "tangyao");

    System.out.println(cache.get("key1"));

    Map val = new HashMap();
    val.put("long", Long.MAX_VALUE);
    val.put("int", Integer.MAX_VALUE);
    val.put("boolean", Boolean.TRUE);

    cache.set("key2", 0, val);

    System.out.println(cache.get("key2"));


    User u1 = new User();
    u1.setId(678001L);
    u1.setName("中文名");
    u1.setDesc("这是备注 this is what?");

    List cars = new ArrayList<Car>();
    Car c1 = new Car();
    c1.setId(1);
    c1.setColor("#ffffff;");
    cars.add(c1);
    u1.setCars(cars);

    cache.set("key3", 0, u1);

    System.out.println(cache.get("key3"));
  }

}
