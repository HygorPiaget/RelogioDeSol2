# General:

The intersection point of a 3D vector (line) and a plane can be determined using the formula $\mathbf{P}=\mathbf{l}_{\mathbf{0}}+t\mathbf{v}$, where $t=\frac{\mathbf{n}\cdot (\mathbf{p}_{\mathbf{0}}-\mathbf{l}_{\mathbf{0}})}{\mathbf{n}\cdot \mathbf{v}}$, provided the line is not parallel to the plane.

## Step 1: Define the equations

First, define the plane by its normal vector $\mathbf{n}$ and a point on the plane $\mathbf{p}_{\mathbf{0}}$. The equation of the plane is given by $\mathbf{n}\cdot (\mathbf{x}-\mathbf{p}_{\mathbf{0}})=0$. Next, define the line by a point on the line $\mathbf{l}_{\mathbf{0}}$ and its direction vector $\mathbf{v}$. The parameterized equation of the line is $\mathbf{x}(t)=\mathbf{l}_{\mathbf{0}}+t\mathbf{v}$, where $t$ is a scalar parameter.

## Step 2: Substitute and solve for t

Substitute the expression for $\mathbf{x}(t)$ from the line equation into the plane equation: $\mathbf{n}\cdot ((\mathbf{l}_{\mathbf{0}}+t\mathbf{v})-\mathbf{p}_{\mathbf{0}})=0$

Rearrange the equation to solve for the parameter $t$:

$\mathbf{n}\cdot (\mathbf{l}_{\mathbf{0}}-\mathbf{p}_{\mathbf{0}}+t\mathbf{v})=0$

$\mathbf{n}\cdot (\mathbf{l}_{\mathbf{0}}-\mathbf{p}_{\mathbf{0}})+t(\mathbf{n}\cdot \mathbf{v})=0$

$t(\mathbf{n}\cdot \mathbf{v})=-\mathbf{n}\cdot (\mathbf{l}_{\mathbf{0}}-\mathbf{p}_{\mathbf{0}})$

$t(\mathbf{n}\cdot \mathbf{v})=\mathbf{n}\cdot (\mathbf{p}_{\mathbf{0}}-\mathbf{l}_{\mathbf{0}})$

Assuming the line is not parallel to the plane ($\mathbf{n}\cdot \mathbf{v}\ne 0$), we solve for $t$:

$t=\frac{\mathbf{n}\cdot (\mathbf{p}_{\mathbf{0}}-\mathbf{l}_{\mathbf{0}})}{\mathbf{n}\cdot \mathbf{v}}$

## Step 3: Find the intersection point

Substitute the calculated value of $t$ back into the line's parameterized equation to find the intersection point $\mathbf{P}$ : $\mathbf{P}=\mathbf{l}_{\mathbf{0}}+t\mathbf{v}$

---

# YZ:

Assuming the vector refers to a line in 3D space defined by a point $\mathbf{P}_{\mathbf{0}}=(x_{0},y_{0},z_{0})$ and a direction vector $\mathbf{v}=(a,b,c)$.

## Step 1: Define the line equation and plane condition

The line in 3D space can be represented parametrically as $\mathbf{r}(t)=\mathbf{P}_{\mathbf{0}}+t\mathbf{v}$, which expands to:

$$x(t)=x_{0}+ta$$
$$y(t)=y_{0}+tb$$
$$z(t)=z_{0}+tc$$

The yz-plane is defined by the condition that all points on it have an x-coordinate of zero: $x=0$.

## Step 2: Solve for the parameter t

To find the intersection point, we set the x-component of the line equation equal to the x-coordinate of the plane condition:$x_{0}+ta=0$

We solve this equation for the parameter $t$:

$$ta=-x_{0}$$
$$t=-x_{0}/a$$

This solution is valid provided the line is not parallel to the yz-plane (i.e., $a\ne 0$).

## Step 3: Find the intersection coordinates

Substitute the value of $t$ back into the $y(t)$ and $z(t)$ equations to find the coordinates of the intersection point $(x_{i},y_{i},z_{i})$:

$$x_{i}=x_{0}+a(-x_{0}/a)=0$$
$$y_{i}=y_{0}+b(-x_{0}/a)$$
$$z_{i}=z_{0}+c(-x_{0}/a)$$

## Step 4: Point

The intersection point with the yz-plane, assuming the line is not parallel to the plane, is located at the coordinates:

$(0,y_{0}-(bx_{0}/a),z_{0}-(cx_{0}/a))$. 

This can be expressed in vector form as $\mathbf{P}=(0,y_{0}-\frac{bx_{0}}{a},z_{0}-\frac{cx_{0}}{a})$.
