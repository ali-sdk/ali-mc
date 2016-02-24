/**
 * Created by yaotang on 16/2/24.
 */
public class Car implements java.io.Serializable  {
  private int id;

  public String getColor() {
    return color;
  }

  public void setColor(String color) {
    this.color = color;
  }

  public int getId() {
    return id;
  }

  public void setId(int id) {
    this.id = id;
  }

  private String color;

}
